import "server-only";
import { connectDb, RoutineLog, Selfie, Lifestyle } from "./mongoose";
import { findActivePlan } from "./plan";
import { projectTrajectory } from "./predict";
import { getLocalDayKey, getLocalDayStart } from "@/lib/utils/date";
import { toPlainUser } from "@/lib/plan/engine";
import { buildLifestyleInputs, countSunscreenDays, INPUT_KEYS, INPUT_META } from "@/lib/whatif/lifestyle";
import { assessReliability } from "@/lib/whatif/reliability";
import { summarizeCheckIns, RECENT_WINDOW_DAYS } from "@/lib/checkin/freshness";

const WINDOW_DAYS = 30;
const DAY_MS = 86400000;

export async function loadWhatIfInputs(user, timezone, overrides = {}) {
  await connectDb();
  const now = new Date();
  const todayKey = getLocalDayKey(timezone, now);
  const plan = await findActivePlan(user._id);

  let sunscreen = null;
  if (plan) {
    const planStartKey = getLocalDayKey(timezone, new Date(plan.startedAt));
    const windowKey = getLocalDayKey(timezone, new Date(now.getTime() - (WINDOW_DAYS - 1) * DAY_MS));
    const windowStartKey = planStartKey > windowKey ? planStartKey : windowKey;
    const logs = await RoutineLog.find({ userId: user._id, date: { $gte: getLocalDayStart(timezone, new Date(`${windowStartKey}T12:00:00Z`)) } })
      .select("date amCompleted pmCompleted")
      .lean();
    sunscreen = countSunscreenDays({
      steps: plan.steps,
      logs,
      dayKeyOf: (d) => getLocalDayKey(timezone, d),
      windowStartKey,
      todayKey,
    });
  }

  const recentLogs = await Lifestyle.find({ userId: user._id, date: { $gte: new Date(now.getTime() - RECENT_WINDOW_DAYS * DAY_MS) } })
    .sort({ date: -1 })
    .limit(10)
    .select("date sleepHours uvMinutes stressLevel")
    .lean();

  const plain = toPlainUser(user);
  return buildLifestyleInputs({ skinProfile: plain.skinProfile ?? null, sunscreen, checkIns: summarizeCheckIns(recentLogs, now), overrides });
}

export function describeInputs(built) {
  return INPUT_KEYS.map((key) => ({
    key,
    label: INPUT_META[key].label,
    options: INPUT_META[key].options,
    value: built.values[key],
    source: built.sources[key],
    detail: built.details[key] || "",
  }));
}

export async function previewWhatIfInputs(user, timezone, overrides = {}) {
  const built = await loadWhatIfInputs(user, timezone, overrides);
  const history = await Selfie.find({ userId: user._id, isAnalyzed: true })
    .sort({ takenAt: -1 })
    .limit(40)
    .select("takenAt scores")
    .lean();
  const baseline = history.find((s) => s.scores && typeof s.scores.wrinkles === "number")?.scores ?? {};
  const meta = projectTrajectory(baseline, 1, { ...built.values, source: "user" }, [], history).meta;
  return { built, reliability: assessReliability({ velocitySource: meta.velocitySource, sources: built.sources }), scanCount: history.length };
}
