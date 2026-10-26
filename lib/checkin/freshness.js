import { SLEEP_OPTIONS, OUTDOOR_OPTIONS, STRESS_OPTIONS } from '../constants/profile.js';

export const WEEKLY_AFTER_DAYS = 7;
export const QUARTERLY_AFTER_DAYS = 90;
export const MIN_ACCOUNT_AGE_DAYS = 7;
export const RECENT_WINDOW_DAYS = 30;
export const MAX_RECENT_ENTRIES = 5;
export const DUPLICATE_WITHIN_DAYS = 3;

const DAY_MS = 86400000;

export const SLEEP_HOURS = Object.freeze({ under6: 5.5, '6to7': 6.5, '7plus': 7.5 });
export const OUTDOOR_MINUTES = Object.freeze({ indoors: 10, some: 25, lots: 60 });

const FIELDS = Object.freeze({
  weekly: ['sleep', 'stress', 'outdoor'],
  quarterly: ['sleep', 'stress', 'outdoor', 'smoker'],
});

const OPTION_SETS = Object.freeze({
  sleep: SLEEP_OPTIONS.map((o) => o.value),
  stress: STRESS_OPTIONS.map((o) => o.value),
  outdoor: OUTDOOR_OPTIONS.map((o) => o.value),
});

const daysBetween = (from, to) => (to.getTime() - from.getTime()) / DAY_MS;

/**
 * Which short prompt, if any, the person should see now. A quarterly refresh
 * (also asks about smoking) wins over the weekly check-in, never both. Nobody is
 * asked in their first week, or without a skin profile to refresh.
 * @param {{ now?: Date, accountCreatedAt?: any, profileRefreshedAt?: any, lastCheckInAt?: any, hasProfile?: boolean }} args
 * @returns {{ kind: 'weekly'|'quarterly', fields: string[] } | null}
 */
export function getFreshnessPrompt({ now = new Date(), accountCreatedAt = null, profileRefreshedAt = null, lastCheckInAt = null, hasProfile = false } = {}) {
  if (!hasProfile) return null;
  const created = accountCreatedAt ? new Date(accountCreatedAt) : null;
  if (!created || Number.isNaN(created.getTime()) || daysBetween(created, now) < MIN_ACCOUNT_AGE_DAYS) return null;

  const refreshed = profileRefreshedAt ? new Date(profileRefreshedAt) : created;
  if (daysBetween(refreshed, now) >= QUARTERLY_AFTER_DAYS) return { kind: 'quarterly', fields: [...FIELDS.quarterly] };

  const last = lastCheckInAt ? new Date(lastCheckInAt) : null;
  const sinceLast = last && !Number.isNaN(last.getTime()) ? daysBetween(last, now) : Infinity;
  if (sinceLast >= WEEKLY_AFTER_DAYS) return { kind: 'weekly', fields: [...FIELDS.weekly] };
  return null;
}

/**
 * Checks answers against the options the questions offer. Returns the clean
 * answers, or null if any asked-for answer is missing or not an offered option.
 */
export function validateCheckIn(raw, kind) {
  const fields = FIELDS[kind];
  if (!fields || !raw || typeof raw !== 'object') return null;
  const out = {};
  for (const field of fields) {
    if (field === 'smoker') {
      if (typeof raw.smoker !== 'boolean') return null;
      out.smoker = raw.smoker;
    } else {
      if (!OPTION_SETS[field].includes(raw[field])) return null;
      out[field] = raw[field];
    }
  }
  return out;
}

/** The Lifestyle document one check-in becomes. */
export function lifestyleFromCheckIn(answers, date = new Date()) {
  return {
    date,
    sleepHours: SLEEP_HOURS[answers.sleep],
    stressLevel: answers.stress,
    uvMinutes: OUTDOOR_MINUTES[answers.outdoor],
  };
}

const nearest = (value, options) => options.reduce((best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best), options[0]);
const STRESS_RANK = { low: 0, medium: 1, high: 2 };

/**
 * What the last few check-ins say, as What-If inputs: the average sleep and sun
 * snapped to the nearest option offered, and the most common stress level (the
 * higher one on a tie). Only entries from the last 30 days, at most five.
 * @returns {{ count: number, sleepHours?: number, uvMinutes?: number, stressLevel?: string } | null}
 */
export function summarizeCheckIns(logs = [], now = new Date()) {
  const cutoff = now.getTime() - RECENT_WINDOW_DAYS * DAY_MS;
  const recent = (Array.isArray(logs) ? logs : [])
    .filter((l) => l && new Date(l.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_RECENT_ENTRIES);
  if (!recent.length) return null;

  const out = { count: recent.length };
  const avg = (key) => {
    const v = recent.map((l) => l[key]).filter((n) => typeof n === 'number' && Number.isFinite(n));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const sleep = avg('sleepHours');
  if (sleep != null) out.sleepHours = nearest(sleep, Object.values(SLEEP_HOURS));
  const sun = avg('uvMinutes');
  if (sun != null) out.uvMinutes = nearest(sun, Object.values(OUTDOOR_MINUTES));

  const tally = {};
  for (const l of recent) if (l.stressLevel in STRESS_RANK) tally[l.stressLevel] = (tally[l.stressLevel] || 0) + 1;
  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1] || STRESS_RANK[b[0]] - STRESS_RANK[a[0]]);
  if (ranked.length) out.stressLevel = ranked[0][0];
  return out;
}

const keyFor = (map, value) => Object.keys(map).find((k) => map[k] === value);

/** A past check-in as the answers it came from, to pre-fill the next one. */
export function answersFromLog(log) {
  if (!log) return {};
  const out = {};
  const sleep = keyFor(SLEEP_HOURS, log.sleepHours);
  const outdoor = keyFor(OUTDOOR_MINUTES, log.uvMinutes);
  if (sleep) out.sleep = sleep;
  if (outdoor) out.outdoor = outdoor;
  if (log.stressLevel in STRESS_RANK) out.stress = log.stressLevel;
  return out;
}
