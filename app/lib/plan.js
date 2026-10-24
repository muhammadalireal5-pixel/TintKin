import "server-only";
import * as Sentry from "@sentry/nextjs";
import { connectDb, Plan, Selfie, RoutineLog } from "./mongoose";
import { generatePlanAdjustment, generatePlanEdit } from "./qwen";
import { getLocalDayKey, getLocalDayStart } from "@/lib/utils/date";
import { PLAN_STATUS, CHECKIN_STATUS, PLAN_METRICS } from "@/lib/constants/plan";
import { sanitizeDraft, sanitizeAdjustment, buildPlan } from "@/lib/plan/build";
import { classifyProfile, buildDraft, buildFocus, filterSafeSteps, safetyBrief } from "@/lib/plan/engine";
import { endUnsafeSteps, mergePlanWithProfile } from "@/lib/plan/rebuild";
import { getPlanDay, getStepsForDay, isPlanExpired, applyScanToPlan, applyAdjustment, applySelfCheckIn, applyRatingsToCheckIn, cleanRatings } from "@/lib/plan/state";

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
 * Builds and stores a plan from the user's onboarding profile with the rules
 * engine (see lib/plan/engine.js). No scan is needed; if the user has one it is
 * stored as the measured baseline. If a concurrent call created the plan first
 * (the unique active-plan index rejects the second), that one is returned.
 * `ratings` carry a finished plan's latest self-ratings into the next 30 days.
 */
export async function createPlan(user, timezone, now = new Date(), { selfie = null, ratings = null } = {}) {
  const plain = typeof user.toObject === "function" ? user.toObject() : user;
  const profile = classifyProfile(plain);
  if (ratings) {
    profile.concerns = profile.concerns.map((c) => ({ ...c, rating: Number.isInteger(ratings[c.key]) ? ratings[c.key] : c.rating }));
  }
  const focus = buildFocus(profile);
  const scores = selfie ? scoresOf(selfie) : {};

  const plan = buildPlan({
    draft: sanitizeDraft(buildDraft({ ...plain, skinProfile: { ...(plain.skinProfile ?? {}), concerns: profile.concerns } })),
    generatedBy: "rules",
    scores,
    overallScore: selfie?.overallScore ?? null,
    skinAge: selfie?.skinAge ?? null,
    goals: user.goals,
    startDayKey: getLocalDayKey(timezone, now),
    startedAt: now,
    selfieId: selfie?._id ?? null,
    focus,
    ratings: Object.fromEntries(focus.map((f) => [f.metric, f.baseline])),
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
 * The user's current plan, creating the first one from their profile if they
 * have none (a scan is optional). An expired plan is returned as-is (the UI
 * offers "start your next 30 days").
 */
export async function ensureActivePlan(user, timezone) {
  const existing = await findActivePlan(user._id);
  if (existing) return { plan: existing, created: false, reason: null };

  const selfie = await latestAnalyzedSelfie(user._id);
  const plan = await createPlan(user, timezone, new Date(), { selfie });
  return { plan, created: true, reason: null };
}

/**
 * Closes the current plan and starts the next 30 days, carrying the latest
 * self-ratings forward as the new starting point. Only allowed once the current
 * plan has run its course (or if there is none).
 */
export async function startNextPlan(user, timezone, now = new Date()) {
  const existing = await findActivePlan(user._id);
  if (existing && !isPlanExpired(existing, getLocalDayKey(timezone, now))) {
    return { plan: existing, created: false, reason: "still_active" };
  }
  const selfie = await latestAnalyzedSelfie(user._id);

  if (existing) {
    await Plan.updateOne({ _id: existing._id, status: PLAN_STATUS.ACTIVE }, { $set: { status: PLAN_STATUS.COMPLETED } });
  }
  const plan = await createPlan(user, timezone, now, { selfie, ratings: existing?.latest?.ratings ?? null });
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
    // A plan made without a scan takes the first scan as its measured baseline,
    // and that scan does not count as a check-in.
    const scores = scoresOf(selfie);
    const needsBaseline = !PLAN_METRICS.some((m) => typeof plan.baseline?.scores?.[m] === "number");
    const { checkIns, latest, completedDay } = applyScanToPlan(
      plan,
      { selfieId: selfie._id, takenAt: selfie.takenAt ?? now, overallScore: selfie.overallScore, scores },
      needsBaseline ? 1 : day
    );
    const set = { checkIns, latest: { ...latest, ratings: plan.latest?.ratings ?? {} } };
    if (needsBaseline) {
      set["baseline.scores"] = scores;
      set["baseline.overallScore"] = selfie.overallScore ?? null;
      set["baseline.skinAge"] = selfie.skinAge ?? null;
    }
    await Plan.updateOne({ _id: plan._id, status: PLAN_STATUS.ACTIVE }, { $set: set });
    return { completedDay, day };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "plan-record-scan" } });
    return null;
  }
}

/**
 * Completes the due check-in from a quick self-rating, or, when a scan already
 * completed it without ratings, attaches the ratings to that check-in.
 * @returns {Promise<{ completedDay: number|null, attached: boolean }>}
 */
export async function recordSelfCheckIn(user, ratings, timezone, now = new Date()) {
  const plan = await findActivePlan(user._id);
  if (!plan) return { completedDay: null, attached: false };
  const clean = cleanRatings(plan, ratings);
  if (!Object.keys(clean).length) return { completedDay: null, attached: false };

  const day = getPlanDay(plan, getLocalDayKey(timezone, now));
  const done = applySelfCheckIn(plan, clean, day, now);
  if (done.completedDay != null) {
    await Plan.updateOne({ _id: plan._id, status: PLAN_STATUS.ACTIVE }, { $set: { checkIns: done.checkIns, latest: done.latest } });
    return { completedDay: done.completedDay, attached: false };
  }

  const lastDone = [...plan.checkIns].reverse().find((c) => c.status === CHECKIN_STATUS.DONE && !Object.keys(c.ratings ?? {}).length);
  const attached = lastDone ? applyRatingsToCheckIn(plan, clean, lastDone.day) : null;
  if (!attached) return { completedDay: null, attached: false };
  await Plan.updateOne({ _id: plan._id, status: PLAN_STATUS.ACTIVE }, { $set: attached });
  return { completedDay: null, attached: true };
}

/**
 * Kin edits the plan from a chat message. The AI proposes drops and adds; both
 * are bounded and safety-filtered, and the plan only changes if the version has
 * not moved meanwhile. While the plan is brand new (day 1) the change applies
 * today, otherwise from tomorrow.
 * @returns {Promise<{ ok: boolean, reply: string, dropped: string[], added: string[] }>}
 */
export async function editPlanFromMessage(user, message, timezone, now = new Date()) {
  const plan = await findActivePlan(user._id);
  if (!plan) return { ok: false, reply: "You don't have a plan to change yet.", dropped: [], added: [] };
  const day = getPlanDay(plan, getLocalDayKey(timezone, now));
  if (day > plan.durationDays) return { ok: false, reply: "Your 30 days are complete. Start your next plan to change it.", dropped: [], added: [] };

  const result = await generatePlanEdit(user, plan, { day: Math.max(1, day), message, safety: safetyBrief(user) });
  if (!result || result.success === false || !result.edit) {
    return { ok: false, reply: "I couldn't change your plan just now. Please try again in a moment.", dropped: [], added: [] };
  }

  const edit = sanitizeAdjustment({ note: result.edit.reply, drop: result.edit.drop, add: result.edit.add });
  const proposed = edit.add.am.length + edit.add.pm.length;
  edit.add = { am: filterSafeSteps(edit.add.am, user), pm: filterSafeSteps(edit.add.pm, user) };
  const skipped = proposed - (edit.add.am.length + edit.add.pm.length);
  const changes = applyAdjustment(plan, edit, Math.max(1, day), { immediate: day <= 1, at: now });
  const entry = changes.adjustments[changes.adjustments.length - 1];
  const reply = `${edit.note || "Done."}${skipped > 0 ? " I left out a suggestion that wouldn't be safe for your skin profile." : ""}`;
  if (!entry.dropped.length && !entry.added.length) return { ok: true, reply, dropped: [], added: [] };

  // Version guard: a concurrent change makes this match nothing instead of overwriting it.
  const res = await Plan.updateOne({ _id: plan._id, status: PLAN_STATUS.ACTIVE, version: plan.version }, { $set: changes });
  if (!res.modifiedCount) return { ok: false, reply: "Your plan just changed. Please ask again.", dropped: [], added: [] };
  const textOf = (id) => changes.steps.find((s) => s.id === id)?.text ?? "";
  return { ok: true, reply, dropped: entry.dropped.map(textOf).filter(Boolean), added: entry.added.map(textOf).filter(Boolean) };
}

/**
 * Safety sweep after the skin profile changes: stops any step in the running
 * plan that the new answers rule out (for example a retinoid after "pregnant:
 * yes"), right away. Runs automatically on every profile save.
 * @returns {Promise<number>} how many steps were stopped
 */
export async function sweepPlanSafety(user, timezone, now = new Date()) {
  const plan = await findActivePlan(user._id);
  if (!plan) return 0;
  const plain = typeof user.toObject === "function" ? user.toObject() : user;
  const day = getPlanDay(plan, getLocalDayKey(timezone, now));
  const { steps, stopped } = endUnsafeSteps(plan, plain, Math.max(1, day));
  if (!stopped.length) return 0;
  const version = plan.version + 1;
  const entry = { version, at: now, day: Math.max(1, Math.min(day, plan.durationDays)), checkInDay: null, selfieId: null, note: "Stopped steps that are not safe for your updated answers.", dropped: stopped, added: [] };
  const res = await Plan.updateOne(
    { _id: plan._id, status: PLAN_STATUS.ACTIVE, version: plan.version },
    { $set: { steps, version, adjustments: [...plan.adjustments, entry] } }
  );
  return res.modifiedCount ? stopped.length : 0;
}

/**
 * Re-plans the rest of the running plan from the current skin profile. The day,
 * check-ins, ticks and progress stay; steps that still fit are kept, the rest
 * end, and new ones start tomorrow.
 * @returns {Promise<{ merged: boolean, added: number, stopped: number }>}
 */
export async function mergePlanFromProfile(user, timezone, now = new Date()) {
  const plan = await findActivePlan(user._id);
  if (!plan) return { merged: false, added: 0, stopped: 0 };
  const plain = typeof user.toObject === "function" ? user.toObject() : user;
  const day = getPlanDay(plan, getLocalDayKey(timezone, now));
  const result = mergePlanWithProfile(plan, plain, Math.max(1, day), { at: now });
  if (!result) return { merged: false, added: 0, stopped: 0 };
  const res = await Plan.updateOne({ _id: plan._id, status: PLAN_STATUS.ACTIVE, version: plan.version }, { $set: result.set });
  return { merged: Boolean(res.modifiedCount), added: result.added.length, stopped: result.stopped.length };
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
  const result = await generatePlanAdjustment(user, plan, { day, scores: plan.latest?.scores, ratings: plan.latest?.ratings, adherencePercent, safety: safetyBrief(user) });
  if (!result || result.success === false || !result.adjustment) return { adjusted: false, reason: "ai_unavailable" };

  const adjustment = sanitizeAdjustment(result.adjustment);
  // The AI may reword and trim, but may not add what the engine would refuse.
  adjustment.add = { am: filterSafeSteps(adjustment.add.am, user), pm: filterSafeSteps(adjustment.add.pm, user) };
  const changes = applyAdjustment(plan, adjustment, day, {
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
