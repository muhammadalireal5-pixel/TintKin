import { dayDiff } from '../utils/streak.js';

export const EARNED_SCAN_RULES = {
  window: 7,
  betterDays: 5,
  minDaysSinceScan: 10,
  baselineEntries: 3,
};

export function mirrorSummary(entries, { todayKey, lastScanKey = null }) {
  const valid = (entries ?? [])
    .filter((e) => Number.isInteger(e?.value) && e.value >= 1 && e.value <= 5 && typeof e.dayKey === 'string')
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
  const byDay = new Map(valid.map((e) => [e.dayKey, e.value]));
  const today = byDay.get(todayKey) ?? null;
  const first = valid.slice(0, EARNED_SCAN_RULES.baselineEntries);
  const baseline = first.length >= EARNED_SCAN_RULES.baselineEntries
    ? first.reduce((sum, e) => sum + e.value, 0) / first.length
    : null;
  const recent = valid.filter((e) => {
    const ago = dayDiff(e.dayKey, todayKey);
    return ago >= 0 && ago < EARNED_SCAN_RULES.window;
  });
  const betterDays = baseline == null ? 0 : recent.filter((e) => e.value > baseline).length;
  const daysSinceScan = lastScanKey ? dayDiff(lastScanKey, todayKey) : null;
  const scanDue = daysSinceScan == null || daysSinceScan >= EARNED_SCAN_RULES.minDaysSinceScan;
  return {
    today,
    baseline: baseline == null ? null : Math.round(baseline * 10) / 10,
    betterDays,
    window: EARNED_SCAN_RULES.window,
    earnedScan: baseline != null && betterDays >= EARNED_SCAN_RULES.betterDays && scanDue,
  };
}
