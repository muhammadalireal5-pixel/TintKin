import { CONCERN_KEYS } from './profile.js';

/**
 * The user-level skin plan: a fixed-length programme with a measurable target,
 * weekly phases and check-in scans. Phase boundaries and check-in days are
 * fixed here; the AI only fills in the steps (see lib/plan/build.js).
 */
export const PLAN_DURATION_DAYS = 30;

export const PLAN_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
});

export const CHECKIN_STATUS = Object.freeze({
  UPCOMING: 'upcoming',
  DONE: 'done',
  MISSED: 'missed',
});

/** Everything a step or focus area can be about: scan metrics and self-rated concerns. */
export const STEP_METRICS = Object.freeze([...new Set(['wrinkles', 'firmness', 'spots', 'radiance', ...CONCERN_KEYS])]);

/** Scores YouCam gives us, all 0-100 where higher is better. */
export const PLAN_METRICS = Object.freeze(['wrinkles', 'firmness', 'spots', 'radiance']);

export const METRIC_LABELS = Object.freeze({
  wrinkles: 'Smoothness',
  firmness: 'Firmness',
  spots: 'Even tone',
  radiance: 'Radiance',
});

/** How many of the weakest metrics the plan sets targets for. */
export const PLAN_FOCUS_COUNT = 2;

/** A re-scan counts toward a check-in up to this many days before it is due. */
export const CHECKIN_EARLY_DAYS = 2;

/** Days (1-based, from the plan's first day) a check-in scan is suggested. */
export const CHECKIN_DAYS = Object.freeze([7, 14, 28]);

export const PLAN_PHASES = Object.freeze([
  { key: 'foundation', name: 'Foundation', startDay: 1, endDay: 7, intent: 'Gentle basics and a steady habit' },
  { key: 'target', name: 'Target', startDay: 8, endDay: 14, intent: 'Add one step aimed at your weakest area' },
  { key: 'build', name: 'Build', startDay: 15, endDay: 21, intent: 'Keep going and add what your skin can take' },
  { key: 'lockin', name: 'Lock in', startDay: 22, endDay: 30, intent: 'Make it automatic and measure the change' },
]);

export const PLAN_SLOTS = Object.freeze(['am', 'pm']);

/** Bounds applied to AI output before it is stored. */
export const PLAN_LIMITS = Object.freeze({
  stepsPerSlot: 6,
  addsPerPhase: 2,
  textLength: 140,
  whyLength: 200,
  summaryLength: 400,
});

/**
 * How long a person wants to work on their skin. Each month is its own
 * 30-day plan; at every month end we review what happened and propose changes
 * for the next one (see lib/plan/review.js). Presets are offered up front, any
 * whole number of months up to the maximum is allowed.
 */
export const PLAN_MONTH_PRESETS = Object.freeze([1, 3, 5, 7]);
export const MAX_PLAN_MONTHS = 12;
export const DEFAULT_PLAN_MONTHS = 3;

/** A whole number of months in 1..MAX_PLAN_MONTHS, or `fallback` if it is not one. */
export function normalizeMonths(value, fallback = null) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PLAN_MONTHS ? n : fallback;
}
