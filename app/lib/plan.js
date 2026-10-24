import "server-only";
import * as Sentry from "@sentry/nextjs";
import { connectDb, Plan, Selfie, RoutineLog } from "./mongoose";
import { generatePlanDraft, generatePlanAdjustment } from "./qwen";
import { getLocalDayKey, getLocalDayStart } from "@/lib/utils/date";
import { PLAN_STATUS, CHECKIN_STATUS } from "@/lib/constants/plan";
import { pickFocus, sanitizeDraft, sanitizeAdjustment, buildPlan } from "@/lib/plan/build";
import { getPlanDay, getStepsForDay, isPlanExpired, applyScanToPlan, applyAdjustment } from "@/lib/plan/state";

const DUPLICATE_KEY = 11000;

/** The user's active plan as a plain object, or null. */
export async function findActivePlan(userId) {
  await connectDb();
  return Plan.findOne({ userId, status: PLAN_STATUS.ACTIVE }).lean();
}

function scoresOf(selfie) {
  const s = selfie?.scores ?? {};
  return { wrinkles: s.wrinkles ?? null, firmness: s.firmness ?? null, spots: s.spots ?? null, radiance: s.radiance ?? null };
}

/**
 * Builds and stores a plan from a scan. Asks the AI for the steps and quietly
 * falls back to the rule-based plan if that fails, so a user always gets one.
 * If a concurrent call created the plan first (the unique active-plan index
 * rejects the second), that one is returned instead.
 */
export async function createPlanFromSelfie(user, selfie, timezone, now = new Date()) {
  const scores = scoresOf(selfie);
  const focus = pickFocus(scores);

  const ai = await generatePlanDraft(user, scores, selfie.overallScore, selfie.skinAge, focus);
  const aiOk = Boolean(ai && ai.success !== false && ai.draft);

  const plan = buildPlan({
    draft: aiOk ? sanitizeDraft(ai.draft) : null,
    generatedBy: aiOk ? "ai" : "fallback",
    scores,
    overallScore: selfie.overallScore,
    skinAge: selfie.skinAge,
    goals: user.goals,
    startDayKey: getLocalDayKey(timezone, now),
    startedAt: now,
    selfieId: selfie._id,
  });

  try {
    const created = await Plan.create({ userId: user._id, ...plan });
    return created.toObject();
  } catch (err) {
    if (err?.code === DUPLICATE_KEY) {
      const existing = await findActivePlan(user._id);
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Today's routine as stable keys (plan step ids), or null if the user has no
 * active plan. Anything that counts or matches ticks against "today's routine"
 * (progress, reminders, badges, the saved log) uses these keys when a plan
 * exists, and falls back to the latest scan's routine text when it doesn't.
 * @returns {Promise<{ am: string[], pm: string[], plan: any }|null>}
 */
export async function getTodayRoutineKeys(userId, timezone, now = new Date()) {
  const plan = await findActivePlan(userId);
  if (!plan) return null;
  const steps = getStepsForDay(plan, getPlanDay(plan, getLocalDayKey(timezone, now)));
  return { am: steps.am.map((s) => s.id), pm: steps.pm.map((s) => s.id), plan };
}

async function latestAnalyzedSelfie(userId) {
  return Selfie.findOne({ userId, isAnalyzed: true, overallScore: { $ne: null } })
    .sort({ takenAt: -1 })
    .select("scores overallScore skinAge takenAt")
    .lean();
}

/**
 * The user's current plan, creating the first one from their latest scan if
 * they have none. Returns { plan, created, reason }: `plan` is null with
 * reason "no_scan" until the user has a scan to build from.
 * An expired plan is returned as-is (the UI offers "start your next 30 days").
 */
export async function ensureActivePlan(user, timezone) {
  const existing = await findActivePlan(user._id);
  if (existing) return { plan: existing, created: false, reason: null };

  const selfie = await latestAnalyzedSelfie(user._id);
  if (!selfie) return { plan: null, created: false, reason: "no_scan" };

  const plan = await createPlanFromSelfie(user, selfie, timezone);
  return { plan, created: true, reason: null };
}

/**
 * Closes the current plan and starts the next 30 days from the latest scan.
 * Only allowed once the current plan has run its course (or if there is none).
 */
export async function startNextPlan(user, timezone, now = new Date()) {
  const existing = await findActivePlan(user._id);
  if (existing && !isPlanExpired(existing, getLocalDayKey(timezone, now))) {
    return { plan: existing, created: false, reason: "still_active" };
  }
  const selfie = await latestAnalyzedSelfie(user._id);
  if (!selfie) return { plan: null, created: false, reason: "no_scan" };

  if (existing) {
    await Plan.updateOne({ _id: existing._id, status: PLAN_STATUS.ACTIVE }, { $set: { status: PLAN_STATUS.COMPLETED } });
  }
  const plan = await createPlanFromSelfie(user, selfie, timezone, now);
  return { plan, created: true, reason: null };
}

/**
 * Records a freshly saved scan on the user's active plan: refreshes the latest
 * snapshot and completes a check-in if one is due. Cheap (no AI) and
 * best-effort: a failure here must never fail the scan that triggered it.
 * @returns {Promise<{ completedDay: number|null, day: number }|null>}
 */
export async function recordScanOnPlan(user, selfie, timezone) {
  try {
    const plan = await findActivePlan(user._id);
    if (!plan) return null;
    const now = new Date();
    const day = getPlanDay(plan, getLocalDayKey(timezone, now));
    const { checkIns, latest, completedDay } = applyScanToPlan(
      plan,
      { selfieId: selfie._id, takenAt: selfie.takenAt ?? now, overallScore: selfie.overallScore, scores: scoresOf(selfie) },
      day
    );
    await Plan.updateOne({ _id: plan._id, status: PLAN_STATUS.ACTIVE }, { $set: { checkIns, latest } });
    return { completedDay, day };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "plan-record-scan" } });
    return null;
  }
}

/** Share of the last 7 days (up to today) on which the user ticked a routine step. */
async function recentAdherencePercent(userId, timezone, plan, now) {
  const dayKey = getLocalDayKey(timezone, now);
  const window = Math.max(1, Math.min(7, getPlanDay(plan, dayKey)));
  const start = getLocalDayStart(timezone, new Date(now.getTime() - (window - 1) * 86400000));
  const logs = await RoutineLog.find({ userId, date: { $gte: start } }).select("date amCompleted pmCompleted").lean();
  const days = new Set(
    logs
      .filter((l) => (l.amCompleted?.length || 0) + (l.pmCompleted?.length || 0) > 0)
      .map((l) => getLocalDayKey(timezone, new Date(l.date)))
  );
  return Math.round((days.size / window) * 100);
}

/**
 * After a completed check-in, asks the AI whether the rest of the plan should
 * change and applies it to the future only. Idempotent per check-in: a second
 * call for the same check-in is a no-op, so retries and double taps are safe.
 * If the AI is unavailable the plan is left untouched and can be retried.
 */
export async function adjustPlanAfterCheckIn(user, timezone, now = new Date()) {
  const plan = await findActivePlan(user._id);
  if (!plan) return { adjusted: false, reason: "no_plan" };

  const done = plan.checkIns.filter((c) => c.status === CHECKIN_STATUS.DONE);
  const checkIn = done[done.length - 1];
  if (!checkIn) return { adjusted: false, reason: "no_check_in" };
  if (plan.adjustments.some((a) => a.checkInDay === checkIn.day)) return { adjusted: false, reason: "already_adjusted" };

  const day = getPlanDay(plan, getLocalDayKey(timezone, now));
  if (day >= plan.durationDays) return { adjusted: false, reason: "plan_ending" };

  const adherencePercent = await recentAdherencePercent(user._id, timezone, plan, now);
  const result = await generatePlanAdjustment(user, plan, { day, scores: plan.latest?.scores, adherencePercent });
  if (!result || result.success === false || !result.adjustment) return { adjusted: false, reason: "ai_unavailable" };

  const changes = applyAdjustment(plan, sanitizeAdjustment(result.adjustment), day, {
    selfieId: checkIn.selfieId,
    checkInDay: checkIn.day,
    at: now,
  });

  // Version guard: if another request adjusted the plan meanwhile, this
  // update matches nothing instead of overwriting their steps.
  const res = await Plan.updateOne(
    { _id: plan._id, status: PLAN_STATUS.ACTIVE, version: plan.version },
    { $set: changes }
  );
  return res.modifiedCount ? { adjusted: true, note: changes.adjustments[changes.adjustments.length - 1].note } : { adjusted: false, reason: "conflict" };
}
