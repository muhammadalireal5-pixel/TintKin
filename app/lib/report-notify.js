import "server-only";
import * as Sentry from "@sentry/nextjs";
import { User, Report, Plan } from "./mongoose";
import { getReportStatus as computeReportStatus } from "@/lib/plan/report";
import { sendReportReadyEmail } from "./email";

/** Plans and check-in reports for a user, the inputs to the pure report logic. */
export async function loadReportInputs(userId) {
  const [plans, reports] = await Promise.all([
    Plan.find({ userId }).sort({ startedAt: -1 }).limit(3).lean(),
    Report.find({ userId, planId: { $ne: null } }).select("planId checkInDay").lean(),
  ]);
  return { plans, reports };
}

export async function getUserReportStatus(userId) {
  const { plans, reports } = await loadReportInputs(userId);
  return computeReportStatus(plans, reports);
}

/**
 * Called after a check-in is completed (a self-rating, or the ratings that follow a
 * scan). Flags the report as ready and emails them exactly once per report (the conditional update on reportReadyAt
 * makes concurrent scans race-safe).
 */
export async function notifyReportReadyIfDue(user, justCompleted) {
  try {
    const status = await getUserReportStatus(user._id);
    if (!status.ready) return { ready: false, justUnlocked: false };
    if (!justCompleted) return { ready: true, justUnlocked: false };

    const claimed = await User.findOneAndUpdate(
      { _id: user._id, reportReadyAt: null },
      { $set: { reportReadyAt: new Date() } }
    );
    if (claimed) {
      await sendReportReadyEmail({ email: user.email, name: user.displayName, checkInDay: status.checkInDay });
    }
    return { ready: true, justUnlocked: Boolean(claimed) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "report-ready-check" } });
    return { ready: false, justUnlocked: false };
  }
}

