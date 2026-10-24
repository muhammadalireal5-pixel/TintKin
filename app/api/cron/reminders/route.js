import { NextResponse } from "next/server";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { connectDb, User, Selfie, RoutineLog, PushSubscription } from "@/app/lib/mongoose";
import { sendPushToUser, pushConfigured } from "@/lib/push/send";
import { pickReminder, localHour, slotForHour } from "@/lib/push/reminders";
import { getLocalDayKey, getLocalDayStart, normalizeTimezone } from "@/lib/utils/date";
import { dayDiff } from "@/lib/utils/streak";
import { getTodayRoutineKeys } from "@/app/lib/plan";
import { toPlanView } from "@/lib/plan/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Call this once an hour (Vercel Cron or any external scheduler) with
// `Authorization: Bearer $CRON_SECRET`. Each run only touches people whose
// own local clock is at the morning or evening slot, and the per-slot claim
// below means a repeated call never sends twice.
function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured) return NextResponse.json({ sent: 0, note: "Push is not configured." });

  try {
    await connectDb();
    const now = new Date();
    const userIds = await PushSubscription.distinct("userId");
    const users = await User.find({ _id: { $in: userIds }, onboardingComplete: true })
      .select("displayName timezone currentStreak lastActiveDayKey lastUploadDate lastPushAm lastPushPm")
      .lean();

    let sent = 0;
    for (const user of users) {
      try {
        const tz = normalizeTimezone(user.timezone);
        const slot = slotForHour(localHour(tz, now));
        if (!slot) continue;

        const dayKey = getLocalDayKey(tz, now);
        const claimField = slot === "am" ? "lastPushAm" : "lastPushPm";
        if (user[claimField] === dayKey) continue;

        const todayStart = getLocalDayStart(tz, now);
        const [latest, latestAnalyzed, todayLog] = await Promise.all([
          Selfie.findOne({ userId: user._id }).sort({ takenAt: -1 }).select("takenAt").lean(),
          Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 }).select("amRoutine pmRoutine").lean(),
          RoutineLog.findOne({ userId: user._id, date: { $gte: todayStart } }).select("amCompleted pmCompleted").lean(),
        ]);

        const lastKey = user.lastActiveDayKey || (user.lastUploadDate ? getLocalDayKey(tz, user.lastUploadDate) : null);
        const planRoutine = await getTodayRoutineKeys(user._id, tz, now);
        const amSteps = planRoutine ? planRoutine.am : latestAnalyzed?.amRoutine || [];
        const pmSteps = planRoutine ? planRoutine.pm : latestAnalyzed?.pmRoutine || [];
        const reminder = pickReminder({
          slot,
          firstName: (user.displayName || "").trim().split(/\s+/)[0] || "",
          streak: user.currentStreak || 0,
          scannedToday: Boolean(latest?.takenAt && new Date(latest.takenAt) >= todayStart),
          stepsDone: (todayLog?.amCompleted?.length || 0) + (todayLog?.pmCompleted?.length || 0),
          stepsTotal: amSteps.length + pmSteps.length,
          checkInDue: Boolean(planRoutine && toPlanView(planRoutine.plan, dayKey).nextCheckIn?.isDue),
          pmLeft: pmSteps.filter((s) => !todayLog?.pmCompleted?.includes(s)).length,
          daysSinceActive: lastKey ? dayDiff(lastKey, dayKey) : 0,
          seed: `${user._id}:${dayKey}:${slot}`,
        });
        if (!reminder) continue;

        // Claim the slot first so a concurrent or repeated run can't double-send.
        const claimed = await User.updateOne({ _id: user._id, [claimField]: { $ne: dayKey } }, { $set: { [claimField]: dayKey } });
        if (!claimed.modifiedCount) continue;

        if ((await sendPushToUser(user._id, reminder)) > 0) sent++;
      } catch (err) {
        Sentry.captureException(err, { tags: { scope: "push-reminder-user" } });
      }
    }
    return NextResponse.json({ sent });
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "push-reminders" } });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
