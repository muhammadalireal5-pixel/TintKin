"use server";

import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser, findSessionUser, SESSION_EXPIRED_PATH } from "@/app/lib/auth-server";
import { connectDb, User, Selfie } from "./mongoose";
import { checkRateLimit } from "./rate-limit";
import { ensureActivePlan, findActivePlan, startNextPlan, adjustPlanAfterCheckIn } from "./plan";
import { getLocalDayKey, normalizeTimezone } from "@/lib/utils/date";
import { toPlanView } from "@/lib/plan/state";

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

/** Starts the next 30 days once the current plan has finished. */
export async function startNextPlanAction(timezone) {
  try {
    const user = await getPlanUser();
    const tz = normalizeTimezone(timezone ?? user.timezone);

    const rate = await checkRateLimit(user._id.toString(), "plan", 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return { success: false, error: `You're doing that a lot. Please try again in ${rate.retryAfter}s.` };
    }

    const { plan, created, reason } = await startNextPlan(user, tz);
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
 * What the first-scan welcome (/welcome) needs to decide where to start: the
 * user's chosen goals, whether consent is still due, and whether they already
 * have a scan (then only the plan needs building) or a plan (nothing to do).
 */
export async function getWelcomeState() {
  try {
    const user = await getPlanUser();
    const [plan, scan] = await Promise.all([
      findActivePlan(user._id),
      Selfie.findOne({ userId: user._id, isAnalyzed: true, overallScore: { $ne: null } }).select("_id").lean(),
    ]);
    return {
      success: true,
      firstName: (user.displayName || "").trim().split(/\s+/)[0] || "",
      goals: Array.isArray(user.goals) ? user.goals.filter((g) => typeof g === "string").slice(0, 6) : [],
      needsConsent: !user.termsAcceptedAt,
      hasScan: Boolean(scan),
      hasPlan: Boolean(plan),
    };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "plan-welcome-state" } });
    return { success: false, error: "We couldn't load this page. Please try again." };
  }
}
