/**
 * Pure streak and activity maths. No DB or clock access, so it is unit-tested
 * in tests/streak.test.mjs. All "keys" are "YYYY-MM-DD" local day keys (see
 * getLocalDayKey in ./date.js), compared as UTC midnights so a DST change
 * never makes a day 23 or 25 hours long.
 *
 * A day is "active" when the user scanned OR ticked at least one routine step,
 * so a care day without a scan still keeps the streak alive. One missed
 * cycle is forgiven automatically once per ISO week (the "freeze").
 */

const DAY_MS = 86400000;

export const WEEKLY_GOAL_DAYS = 5;

export function dayDiff(fromKey, toKey) {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / DAY_MS);
}

/** Monday of the ISO week containing `dayKey`, as a day key. */
export function weekKeyOf(dayKey) {
  const d = new Date(`${dayKey}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

/**
 * What happens to the stored streak when the user is active on `todayKey`.
 * @returns {{ streak: number, freezeWeek: string|null, isNewDay: boolean, usedFreeze: boolean }}
 */
export function advanceStreak({ stored = 0, lastKey = null, todayKey, allowedGapDays = 1, freezeWeek = null }) {
  if (!lastKey) return { streak: 1, freezeWeek, isNewDay: true, usedFreeze: false };
  const diff = dayDiff(lastKey, todayKey);
  if (diff <= 0) return { streak: Math.max(stored, 1), freezeWeek, isNewDay: false, usedFreeze: false };
  if (diff <= allowedGapDays) return { streak: stored + 1, freezeWeek, isNewDay: true, usedFreeze: false };
  const thisWeek = weekKeyOf(todayKey);
  if (diff === allowedGapDays + 1 && freezeWeek !== thisWeek) {
    return { streak: stored + 1, freezeWeek: thisWeek, isNewDay: true, usedFreeze: true };
  }
  return { streak: 1, freezeWeek, isNewDay: true, usedFreeze: false };
}

/** The streak as it should read right now, without writing anything back. */
export function displayStreak({ stored = 0, lastKey = null, todayKey, allowedGapDays = 1, freezeWeek = null }) {
  if (!stored || !lastKey) return stored;
  const diff = dayDiff(lastKey, todayKey);
  if (diff <= allowedGapDays) return stored;
  if (diff === allowedGapDays + 1 && freezeWeek !== weekKeyOf(todayKey)) return stored;
  return 0;
}

/**
 * Rolls scans and routine logs up into the numbers the dashboard and progress
 * screens show. `scans` is [{ takenAt, overallScore, isAnalyzed }], `logs` is
 * [{ date, amCompleted, pmCompleted }]; `dayKeyOf(date)` maps a Date to a key.
 */
export function summarizeActivity({ scans = [], logs = [], todayKey, dayKeyOf }) {
  const activeKeys = new Set();
  for (const s of scans) activeKeys.add(dayKeyOf(new Date(s.takenAt)));
  for (const l of logs) {
    if ((l.amCompleted?.length || 0) + (l.pmCompleted?.length || 0) > 0) activeKeys.add(dayKeyOf(new Date(l.date)));
  }

  const monthKey = todayKey.slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  const prevMonthKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;

  const countIn = (prefix) => [...activeKeys].filter((k) => k.startsWith(prefix)).length;
  const scoreAvg = (prefix) => {
    const vals = scans
      .filter((s) => s.isAnalyzed !== false && typeof s.overallScore === "number" && dayKeyOf(new Date(s.takenAt)).startsWith(prefix))
      .map((s) => s.overallScore);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  const weekKey = weekKeyOf(todayKey);
  const perWeek = new Map();
  for (const k of activeKeys) perWeek.set(weekKeyOf(k), (perWeek.get(weekKeyOf(k)) || 0) + 1);

  const stepsByDay = new Map();
  for (const l of logs) {
    const k = dayKeyOf(new Date(l.date));
    stepsByDay.set(k, (stepsByDay.get(k) || 0) + (l.amCompleted?.length || 0) + (l.pmCompleted?.length || 0));
  }
  const weekSteps = Array.from({ length: 7 }, (_, i) =>
    stepsByDay.get(new Date(Date.parse(weekKey) + i * DAY_MS).toISOString().slice(0, 10)) || 0
  );

  return {
    weekSteps,
    weekTodayIndex: dayDiff(weekKey, todayKey),
    weekDays: perWeek.get(weekKey) || 0,
    weeklyGoal: WEEKLY_GOAL_DAYS,
    monthDays: countIn(monthKey),
    prevMonthDays: countIn(prevMonthKey),
    monthScore: scoreAvg(monthKey),
    prevMonthScore: scoreAvg(prevMonthKey),
    bestWeekDays: perWeek.size ? Math.max(...perWeek.values()) : 0,
  };
}
