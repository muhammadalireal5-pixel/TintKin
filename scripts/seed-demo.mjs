import { connectDb, User, Plan, RoutineLog } from "../app/lib/mongoose.js";
import { upgradeToCoach, composeDay, hasCoach } from "../lib/plan/coach.js";
import { getLocalDayStart, normalizeTimezone } from "../lib/utils/date.js";

const DAY_MS = 86400000;
const DAYS = 14;
const MIRROR = [2, 3, 2, 3, 3, 3, 4, 3, 4, 4, 3, 4, 4, 5];

const email = process.argv.find((a) => a.includes("@"));
const apply = process.argv.includes("--apply");
if (!email) {
  console.error("Usage: bun --preload ./scripts/shim-server-only.mjs scripts/seed-demo.mjs demo@example.com [--apply]");
  process.exit(1);
}

await connectDb();
const user = await User.findOne({ email: email.toLowerCase().trim() });
if (!user) {
  console.error(`No account for ${email}. Sign up and finish onboarding first.`);
  process.exit(1);
}
const plan = await Plan.findOne({ userId: user._id, status: "active" }).lean();
if (!plan) {
  console.error("That account has no active plan yet. Open /welcome once to create it.");
  process.exit(1);
}

const tz = normalizeTimezone(user.timezone);
const now = new Date();
const start = new Date(now.getTime() - DAYS * DAY_MS);
const startDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(start);
const coached = hasCoach(plan) ? plan : { ...plan, ...upgradeToCoach(plan) };
const shifted = {
  ...coached,
  startDayKey,
  startedAt: start,
  endsAt: new Date(start.getTime() + plan.durationDays * DAY_MS),
  checkIns: plan.checkIns.map((c) => ({ ...c, dueAt: new Date(start.getTime() + (c.day - 1) * DAY_MS) })),
  coach: { ...coached.coach, reactions: [{ day: 9, level: "tingle", slot: "pm", classes: [], at: new Date(start.getTime() + 8 * DAY_MS) }] },
};

const logs = [];
for (let i = 0; i < DAYS; i++) {
  const day = i + 1;
  const date = new Date(getLocalDayStart(tz, new Date(start.getTime() + i * DAY_MS)).getTime() + 12 * 3600000);
  const today = composeDay(shifted, day);
  const skipPm = i % 5 === 3;
  logs.push({
    userId: user._id,
    date,
    amCompleted: today.am.map((s) => s.id),
    pmCompleted: skipPm ? [] : today.pm.map((s) => s.id),
    mirror: MIRROR[i],
  });
}

console.log(`Account: ${email}`);
console.log(`Plan moves to start on ${startDayKey} (today becomes day ${DAYS + 1}).`);
console.log(`Writes ${logs.length} routine logs with mirror checks, and one tingle on day 9.`);
if (!apply) {
  console.log("Dry run. Add --apply to write.");
  process.exit(0);
}

const firstLogDay = getLocalDayStart(tz, start);
await RoutineLog.deleteMany({ userId: user._id, date: { $gte: firstLogDay, $lt: getLocalDayStart(tz, now) } });
await RoutineLog.insertMany(logs);
await Plan.updateOne(
  { _id: plan._id },
  {
    $set: {
      startDayKey: shifted.startDayKey,
      startedAt: shifted.startedAt,
      endsAt: shifted.endsAt,
      checkIns: shifted.checkIns,
      steps: shifted.steps,
      coach: shifted.coach,
    },
    $inc: { rev: 1 },
  }
);
console.log("Done.");
process.exit(0);
