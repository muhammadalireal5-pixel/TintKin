import { NextResponse } from "next/server";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { connectDb, User, Selfie, RoutineLog, PushSubscription, Plan } from "@/app/lib/mongoose";
import { sendPushToUser, pushConfigured } from "@/lib/push/send";
import { pickReminder, localHour, slotForHour } from "@/lib/push/reminders";
import { getLocalDayKey, getLocalDayStart, normalizeTimezone } from "@/lib/utils/date";
import { dayDiff } from "@/lib/utils/streak";
import { toPlanView, getStepsForDay, getPlanDay } from "@/lib/plan/state";
import { PLAN_STATUS } from "@/lib/constants/plan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 10;
const TIME_BUDGET_MS = 50000;

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
    const startedAt = Date.now();
    const userIds = await PushSubscription.distinct("userId");
    const users = await User.find({ _id: { $in: userIds }, onboardingComplete: true })
      .select("displayName timezone currentStreak lastActiveDayKey lastUploadDate lastPushAm lastPushPm")
      .lean();

    const due = [];
    for (const user of users) {
      const tz = normalizeTimezone(user.timezone);
      const slot = slotForHour(localHour(tz, now));
      if (!slot) continue;
      const dayKey = getLocalDayKey(tz, now);
      const claimField = slot === "am" ? "lastPushAm" : "lastPushPm";
      if (user[claimField] === dayKey) continue;
      due.push({ user, tz, slot, dayKey, claimField, todayStart: getLocalDayStart(tz, now) });
    }
    if (!due.length) return NextResponse.json({ sent: 0, due: 0, remaining: 0 });

    const ids = due.map((d) => d.user._id);
    const earliest = new Date(Math.min(...due.map((d) => d.todayStart.getTime())));
    const [latestScans, latestRoutines, todayLogs, plans] = await Promise.all([
      Selfie.aggregate([
        { $match: { userId: { $in: ids } } },
        { $sort: { takenAt: -1 } },
        { $group: { _id: "$userId", takenAt: { $first: "$takenAt" } } },
      ]),
      Selfie.aggregate([
        { $match: { userId: { $in: ids }, isAnalyzed: true } },
        { $sort: { takenAt: -1 } },
        { $group: { _id: "$userId", amRoutine: { $first: "$amRoutine" }, pmRoutine: { $first: "$pmRoutine" } } },
      ]),
      RoutineLog.find({ userId: { $in: ids }, date: { $gte: earliest } }).select("userId date amCompleted pmCompleted").lean(),
      Plan.find({ userId: { $in: ids }, status: PLAN_STATUS.ACTIVE }).lean(),
    ]);
    const byUser = (rows) => new Map(rows.map((r) => [String(r._id), r]));
    const scanMap = byUser(latestScans);
    const routineMap = byUser(latestRoutines);
    const planMap = new Map(plans.map((p) => [String(p.userId), p]));
    const logsByUser = new Map();
    for (const l of todayLogs) {
      const key = String(l.userId);
      logsByUser.set(key, [...(logsByUser.get(key) ?? []), l]);
    }

    const one = async ({ user, tz, slot, dayKey, claimField, todayStart }) => {
      const uid = String(user._id);
      const latest = scanMap.get(uid);
      const todayLog = (logsByUser.get(uid) ?? []).find((l) => new Date(l.date) >= todayStart) ?? null;
      const plan = planMap.get(uid) ?? null;
      const planSteps = plan ? getStepsForDay(plan, getPlanDay(plan, dayKey)) : null;
      const amSteps = planSteps ? planSteps.am.map((x) => x.id) : routineMap.get(uid)?.amRoutine || [];
      const pmSteps = planSteps ? planSteps.pm.map((x) => x.id) : routineMap.get(uid)?.pmRoutine || [];
      const lastKey = user.lastActiveDayKey || (user.lastUploadDate ? getLocalDayKey(tz, user.lastUploadDate) : null);
      const reminder = pickReminder({
        slot,
        firstName: (user.displayName || "").trim().split(/\s+/)[0] || "",
        streak: user.currentStreak || 0,
        scannedToday: Boolean(latest?.takenAt && new Date(latest.takenAt) >= todayStart),
        stepsDone: (todayLog?.amCompleted?.length || 0) + (todayLog?.pmCompleted?.length || 0),
        stepsTotal: amSteps.length + pmSteps.length,
        checkInDue: Boolean(plan && toPlanView(plan, dayKey).nextCheckIn?.isDue),
        pmLeft: pmSteps.filter((x) => !todayLog?.pmCompleted?.includes(x)).length,
        daysSinceActive: lastKey ? dayDiff(lastKey, dayKey) : 0,
        seed: `${uid}:${dayKey}:${slot}`,
      });
      if (!reminder) return false;
      const claimed = await User.updateOne({ _id: user._id, [claimField]: { $ne: dayKey } }, { $set: { [claimField]: dayKey } });
      if (!claimed.modifiedCount) return false;
      return (await sendPushToUser(user._id, reminder)) > 0;
    };

    let sent = 0;
    let next = 0;
    const worker = async () => {
      while (next < due.length && Date.now() - startedAt < TIME_BUDGET_MS) {
        const item = due[next++];
        try {
          if (await one(item)) sent++;
        } catch (err) {
          Sentry.captureException(err, { tags: { scope: "push-reminder-user" } });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, due.length) }, worker));
    return NextResponse.json({ sent, due: due.length, remaining: Math.max(0, due.length - next) });
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "push-reminders" } });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
