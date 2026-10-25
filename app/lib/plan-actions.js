"use server";

import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser, findSessionUser, SESSION_EXPIRED_PATH } from "@/app/lib/auth-server";
import { connectDb, User, Selfie, Plan } from "./mongoose";
import { checkRateLimit } from "./rate-limit";
import { ensureActivePlan, findActivePlan, startNextPlan, getMonthReview, setPlanMonths, adjustPlanAfterCheckIn, recordSelfCheckIn, editPlanFromMessage, mergePlanFromProfile } from "./plan";
import { getLocalDayKey, normalizeTimezone } from "@/lib/utils/date";
import { toPlanView } from "@/lib/plan/state";
import { notifyReportReadyIfDue } from "./report-notify";
import { classifyProfile, toPlainUser } from "@/lib/plan/engine";
import { CONCERNS } from "@/lib/constants/profile";
import { PLAN_STATUS } from "@/lib/constants/plan";

// Same checks as getDbUser() in actions.js.
async function getPlanUser() {
  const [, auth] = await Promise.all([
    connectDb(),
    getAuthenticatedUser().then(
      (decoded) => ({ decoded }),
      () => ({ decoded: null })
    ),
  ]);
  if (!auth.decoded) redirect("/sign-in");
  const user = await findSessionUser(auth.decoded);
  if (!user) redirect(SESSION_EXPIRED_PATH);
  if (!user.onboardingComplete) redirect("/onboarding");
  return user;
}

const FAILED = { success: false, error: "We couldn't load your plan. Please try again." };

function viewOf(plan, timezone) {
  return toPlanView(plan, getLocalDayKey(timezone));
}

/** The current plan for display, or `plan: null` if the user has none yet. Never generates. */
export async function getActivePlan(timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);
    const plan = await findActivePlan(user._id);
    return { success: true, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-get" } });
    return FAILED;
  }
}

/**
 * Returns the user's plan, building the first one from their latest scan if
 * needed. `reason: "no_scan"` means there is nothing to build from yet.
 */
export async function ensurePlan(timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);

    // Only generating costs an AI call, so only that is rate limited.
    const existing = await findActivePlan(user._id);
    if (existing) return { success: true, created: false, reason: null, plan: viewOf(existing, tz) };

    const rate = await checkRateLimit(user._id.toString(), "plan", 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: `You're doing that a lot. Please try again in ${rate.retryAfter}s.` };
    }

    const { plan, created, reason } = await ensureActivePlan(user, tz);
    if (user.timezone !== tz) await User.findByIdAndUpdate(user._id, { timezone: tz }).catch(() => {});
    return { success: true, created, reason, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-ensure" } });
    return FAILED;
  }
}

/**
 * The end-of-month review for a finished plan: what the records show and what we
 * propose for the next month. `review: null` while a month is still running.
 */
export async function getMonthReviewAction(timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);
    return { success: true, review: await getMonthReview(user, tz) };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-review-month" } });
    return FAILED;
  }
}

/** Changes how many months the person wants to work on their skin (1-12, never below the month they are in). */
export async function setPlanLength(months, timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);
    const out = await setPlanMonths(user, months);
    if (!out) return { success: false, error: "Please pick between 1 and 12 months." };
    const plan = await findActivePlan(user._id);
    return { success: true, months: out.months, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-length" } });
    return FAILED;
  }
}

/**
 * Starts the next month once the current one has finished. `accept` says
 * whether the person agreed to the changes we proposed in the month review.
 */
export async function startNextPlanAction(timezone, accept = false) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);

    const rate = await checkRateLimit(user._id.toString(), "plan", 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: `You're doing that a lot. Please try again in ${rate.retryAfter}s.` };
    }

    const { plan, created, reason } = await startNextPlan(user, tz, new Date(), { accept: accept === true });
    return { success: true, created, reason, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-next" } });
    return FAILED;
  }
}

/**
 * Called by the plan UI after a check-in scan: asks the AI to adjust the
 * future of the plan. Safe to call repeatedly (a check-in is only answered once).
 */
export async function reviewCheckIn(timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);

    const rate = await checkRateLimit(user._id.toString(), "plan", 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: `You're doing that a lot. Please try again in ${rate.retryAfter}s.` };
    }

    const result = await adjustPlanAfterCheckIn(user, tz);
    const plan = await findActivePlan(user._id);
    return { success: true, ...result, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-review" } });
    return FAILED;
  }
}

/**
 * Re-plans the rest of the running plan from the saved skin profile, keeping
 * the day, check-ins and progress. The default after a profile update.
 */
export async function refreshPlanFromProfile(timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);
    const result = await mergePlanFromProfile(user, tz);
    const plan = await findActivePlan(user._id);
    return { success: true, ...result, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-refresh" } });
    return FAILED;
  }
}

/**
 * Closes the active plan so a fresh one can be built from updated answers
 * (/welcome builds it). Routine history, streaks and old reports are kept; the
 * new plan starts again at day 1.
 */
export async function retireActivePlan() {
  try {
    const user = await getPlanUser();
    await Plan.updateMany({ userId: user._id, status: PLAN_STATUS.ACTIVE }, { $set: { status: PLAN_STATUS.COMPLETED } });
    return { success: true };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-retire" } });
    return FAILED;
  }
}

/**
 * Kin changes the plan from a chat message. Rate limited (AI call) and
 * length-bounded; the reply says what changed.
 */
export async function chatWithKin(message, timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);
    const text = typeof message === "string" ? message.trim().slice(0, 300) : "";
    if (!text) return { success: false, error: "Tell me what you'd like to change." };

    const rate = await checkRateLimit(user._id.toString(), "plan-chat", 12, 60 * 60 * 1000);
    if (!rate.allowed) return { success: false, error: `Let's pause for a moment. Try again in ${rate.retryAfter}s.` };

    const result = await editPlanFromMessage(user, text, tz);
    const plan = await findActivePlan(user._id);
    return { success: result.ok, reply: result.reply, dropped: result.dropped, added: result.added, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-chat" } });
    return { success: false, error: "Kin couldn't change your plan just now. Please try again." };
  }
}

/**
 * A quick self-rated check-in (no scan): `ratings` maps each focus area to 1-5.
 * Completes the due check-in, or attaches the ratings to one a scan already
 * completed. The caller then runs reviewCheckIn for the coach's note.
 */
export async function submitCheckInRatings(ratings, timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);
    const result = await recordSelfCheckIn(user, ratings, tz);
    const plan = await findActivePlan(user._id);
    if (!result.completedDay && !result.attached) {
      return { success: false, error: "There is no check-in to complete right now.", plan: plan ? viewOf(plan, tz) : null };
    }
    // The report is ready once the ratings are in (a scan alone no longer unlocks it).
    await notifyReportReadyIfDue(user, true);
    return { success: true, ...result, plan: plan ? viewOf(plan, tz) : null };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-self-checkin" } });
    return FAILED;
  }
}

/**
 * What the plan reveal (/welcome) needs: the user's profile (echoed on the
 * building screen), whether photo consent is still due for the optional baseline
 * selfie, and whether they already have a plan (then there is nothing to do).
 */
export async function getWelcomeState() {
  try {
    const user = await getPlanUser();
    const [plan, scan] = await Promise.all([
      findActivePlan(user._id),
      Selfie.findOne({ userId: user._id, isAnalyzed: true, overallScore: { $ne: null } }).select("_id").lean(),
    ]);
    const p = classifyProfile(toPlainUser(user));
    return {
      success: true,
      firstName: (user.displayName || "").trim().split(/\s+/)[0] || "",
      needsConsent: !user.termsAcceptedAt,
      hasScan: Boolean(scan),
      hasPlan: Boolean(plan),
      // Echoed back on the "building your plan" screen, so what it says is what they told us.
      profile: {
        skinType: p.skinType,
        sensitivity: p.sensitive ? "high" : p.medium ? "medium" : "low",
        phototype: p.phototype,
        concerns: p.concerns.map((c) => ({ key: c.key, label: CONCERNS[c.key].label, rating: c.rating })),
        pregnant: p.pregnant,
        avoidUnsafe: p.avoidUnsafe,
        usesRetinoid: p.usesRetinoid,
        routineTime: p.routineTime,
        sleepShort: p.sleep === "under6",
        highSun: p.outdoor === "lots" || p.phototype <= 2,
      },
    };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-welcome-state" } });
    return { success: false, error: "We couldn't load this page. Please try again." };
  }
}
