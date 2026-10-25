/**
 * Pure plan state: which day of the plan it is, which steps are active, how
 * check-ins and progress stand, and how an adjustment edits the future.
 * Day numbers are 1-based and computed from local day keys (never elapsed
 * wall-clock time), so DST and timezones don't shift a plan day.
 */
import { dayDiff } from '../utils/streak.js';
import {
  CHECKIN_STATUS,
  CHECKIN_EARLY_DAYS,
  PLAN_METRICS,
  PLAN_LIMITS,
  PLAN_SLOTS,
  PLAN_PHASES,
} from '../constants/plan.js';
import { CONCERNS, CONCERN_KEYS } from '../constants/profile.js';

const isScore = (v) => typeof v === 'number' && Number.isFinite(v);
const isRating = (v) => Number.isInteger(v) && v >= 1 && v <= 5;

/** Keeps only valid 1-5 ratings for the plan's focus areas. */
export function cleanRatings(plan, raw) {
  const allowed = new Set(plan.focus.map((f) => f.metric));
  const out = {};
  for (const key of CONCERN_KEYS) {
    const v = Number(raw?.[key]);
    if (allowed.has(key) && isRating(v)) out[key] = v;
  }
  return out;
}

/** Plan day for `todayKey`; 0 before the plan starts. */
export function getPlanDay(plan, todayKey) {
  return Math.max(0, dayDiff(plan.startDayKey, todayKey) + 1);
}

export function isPlanExpired(plan, todayKey) {
  return getPlanDay(plan, todayKey) > plan.durationDays;
}

const clampDay = (plan, day) => Math.min(Math.max(day, 1), plan.durationDays);

export function getPhaseForDay(plan, day) {
  const d = clampDay(plan, day);
  const phases = plan.phases?.length ? plan.phases : PLAN_PHASES;
  return phases.find((p) => d >= p.startDay && d <= p.endDay) ?? phases[phases.length - 1];
}

const isActiveOn = (step, day) => step.startDay <= day && (step.endDay == null || day <= step.endDay);

/** Active on `day`, or still to start and not already cancelled. */
export const isLive = (step, day) => (step.startDay > day ? step.endDay == null || step.endDay >= step.startDay : isActiveOn(step, day));

/**
 * Stops a step. One still to start never starts; a running one ends today (so
 * today's tick still counts and the change lands tomorrow), or yesterday when
 * `now` is set (unsafe steps, brand-new plans, the last day).
 */
export function stopStep(step, today, now = false) {
  if (step.startDay > today) return { ...step, endDay: step.startDay - 1 };
  return { ...step, endDay: now ? today - 1 : today };
}

/** Whether a step is (or will be) part of the plan from `day` onward. */
const countsFrom = (step, day) => step.endDay == null || step.endDay >= Math.max(day, step.startDay);

/** Steps active on `day`, split into the morning and evening lists. */
export function getStepsForDay(plan, day) {
  const d = clampDay(plan, day);
  const active = plan.steps.filter((s) => isActiveOn(s, d));
  return {
    am: active.filter((s) => s.slot === 'am'),
    pm: active.filter((s) => s.slot === 'pm'),
  };
}

/** Steps that started during the current phase (the "new this week" ones). */
export function getNewStepIds(plan, day) {
  const d = clampDay(plan, day);
  const phase = getPhaseForDay(plan, d);
  if (phase.startDay === 1) return [];
  return plan.steps
    .filter((s) => s.startDay >= phase.startDay && s.startDay <= phase.endDay && isActiveOn(s, d))
    .map((s) => s.id);
}

/** The check-in the user should do next, if any is still ahead. */
export function getNextCheckIn(plan) {
  return plan.checkIns.find((c) => c.status === CHECKIN_STATUS.UPCOMING) ?? null;
}

/**
 * Records a scan against the plan. Always refreshes `latest`; additionally
 * completes the latest upcoming check-in that is due (or due within
 * CHECKIN_EARLY_DAYS), marking any earlier ones missed. A baseline scan on
 * plan day 1 never completes a check-in.
 * @param {object} plan
 * @param {{ selfieId: any, takenAt: Date, overallScore: number|null, scores: Record<string, number|null> }} scan
 * @param {number} day plan day of the scan
 * @returns {{ checkIns: any[], latest: any, completedDay: number|null }}
 */
export function applyScanToPlan(plan, scan, day) {
  const scores = Object.fromEntries(PLAN_METRICS.map((m) => [m, isScore(scan.scores?.[m]) ? scan.scores[m] : null]));
  const latest = {
    selfieId: scan.selfieId,
    at: scan.takenAt,
    overallScore: isScore(scan.overallScore) ? scan.overallScore : null,
    scores,
  };

  let checkIns = plan.checkIns.map((c) => ({ ...c }));
  let completedDay = null;
  const target = day > 1
    ? [...checkIns].reverse().find((c) => c.status === CHECKIN_STATUS.UPCOMING && c.day - CHECKIN_EARLY_DAYS <= day)
    : null;
  if (target) {
    completedDay = target.day;
    checkIns = checkIns.map((c) => {
      if (c.day === target.day) {
        return { ...c, status: CHECKIN_STATUS.DONE, selfieId: scan.selfieId, completedAt: scan.takenAt, overallScore: latest.overallScore, scores, method: 'scan' };
      }
      if (c.day < target.day && c.status === CHECKIN_STATUS.UPCOMING) return { ...c, status: CHECKIN_STATUS.MISSED };
      return c;
    });
  }
  return { checkIns, latest, completedDay };
}

/**
 * Progress against the baseline using the most recent scan.
 * `percentToTarget` is 0-100 (never negative, capped at 100).
 */
export function getProgress(plan) {
  const current = plan.latest?.scores ?? {};
  const currentRatings = plan.latest?.ratings ?? {};
  const focus = plan.focus.map((f) => {
    if (f.scale === 'rating') {
      const rated = isRating(currentRatings[f.metric]) ? currentRatings[f.metric] : null;
      const now = rated ?? f.baseline;
      const span = f.target - f.baseline;
      const percentToTarget = span <= 0
        ? (now >= f.target ? 100 : 0)
        : Math.max(0, Math.min(100, Math.round(((now - f.baseline) / span) * 100)));
      // A scan adds a measured number next to the self-rating where one exists.
      const scanMetric = CONCERNS[f.metric]?.scanMetric;
      const from = scanMetric ? plan.baseline?.scores?.[scanMetric] : null;
      const to = scanMetric ? current[scanMetric] : null;
      const measured = isScore(from) && isScore(to) ? { from: Math.round(from), to: Math.round(to) } : null;
      return { ...f, current: now, rated: rated != null, delta: now - f.baseline, percentToTarget, measured };
    }
    const now = isScore(current[f.metric]) ? current[f.metric] : null;
    const delta = now == null ? null : Math.round(now - f.baseline);
    const span = f.target - f.baseline;
    const percentToTarget = now == null || span <= 0
      ? 0
      : Math.max(0, Math.min(100, Math.round(((now - f.baseline) / span) * 100)));
    return { ...f, scale: 'score', current: now == null ? null : Math.round(now), rated: now != null, delta, percentToTarget, measured: null };
  });
  const baseOverall = plan.baseline?.overallScore;
  const nowOverall = plan.latest?.overallScore;
  const overallDelta = isScore(baseOverall) && isScore(nowOverall) ? Math.round(nowOverall - baseOverall) : null;
  return { focus, overallDelta, targetsReached: focus.length > 0 && focus.every((f) => f.percentToTarget >= 100) };
}

/**
 * Completes the due check-in from a quick self-rating (no scan). Same timing
 * rules as a scan: the latest upcoming check-in that is due or due within
 * CHECKIN_EARLY_DAYS; earlier upcoming ones become missed.
 * @returns {{ checkIns: any[], latest: any, completedDay: number|null }}
 */
export function applySelfCheckIn(plan, ratings, day, at = new Date()) {
  const clean = cleanRatings(plan, ratings);
  const latest = { ...(plan.latest ?? {}), ratings: { ...(plan.latest?.ratings ?? {}), ...clean } };
  const target = day > 1
    ? [...plan.checkIns].reverse().find((c) => c.status === CHECKIN_STATUS.UPCOMING && c.day - CHECKIN_EARLY_DAYS <= day)
    : null;
  if (!target || !Object.keys(clean).length) return { checkIns: plan.checkIns.map((c) => ({ ...c })), latest: plan.latest, completedDay: null };
  const checkIns = plan.checkIns.map((c) => {
    if (c.day === target.day) return { ...c, status: CHECKIN_STATUS.DONE, completedAt: at, ratings: clean, method: 'self' };
    if (c.day < target.day && c.status === CHECKIN_STATUS.UPCOMING) return { ...c, status: CHECKIN_STATUS.MISSED };
    return c;
  });
  return { checkIns, latest, completedDay: target.day };
}

/** Attaches ratings to a check-in that a scan already completed (so progress reads them). */
export function applyRatingsToCheckIn(plan, ratings, checkInDay) {
  const clean = cleanRatings(plan, ratings);
  if (!Object.keys(clean).length) return null;
  const checkIns = plan.checkIns.map((c) => (c.day === checkInDay && c.status === CHECKIN_STATUS.DONE ? { ...c, ratings: clean, method: c.method ?? 'scan' } : c));
  return { checkIns, latest: { ...(plan.latest ?? {}), ratings: { ...(plan.latest?.ratings ?? {}), ...clean } } };
}

/**
 * Applies an adjustment to the FUTURE only: dropped steps end today (so
 * today's ticks stay valid) and new steps start tomorrow. Never rewrites the
 * past, and keeps each slot within its step limit.
 * @param {object} plan
 * @param {{ note?: string, drop?: string[], add?: { am?: any[], pm?: any[] } }} adjustment added steps are already sanitized ({text, why, metric})
 * @param {number} day current plan day
 * @param {{ immediate?: boolean, source?: string }} [opts] `immediate` starts changes today rather
 *   than tomorrow; `source` ('check-in' | 'kin' | 'profile' | 'safety') says who made the change
 */
export function applyAdjustment(plan, adjustment, day, { selfieId = null, checkInDay = null, at = new Date(), immediate = false, source = 'check-in' } = {}) {
  const today = clampDay(plan, day);
  const dropIds = new Set(Array.isArray(adjustment.drop) ? adjustment.drop : []);
  // Steps still to start can be dropped too, so a step due on day 15 can be removed on day 3.
  const dropped = plan.steps.filter((s) => dropIds.has(s.id) && isLive(s, today)).map((s) => s.id);
  // On the last day there is no "tomorrow", so changes apply today (and replace, not overlap).
  const now = immediate || today >= plan.durationDays;
  let steps = plan.steps.map((s) => (dropped.includes(s.id) ? stopStep(s, today, now) : s));

  let n = steps.reduce((max, s) => Math.max(max, Number(String(s.id).slice(1)) || 0), 0);
  const startDay = now ? today : Math.min(today + 1, plan.durationDays);
  const added = [];
  for (const slot of PLAN_SLOTS) {
    // Upcoming steps count too, so Kin cannot add a duplicate of one that is already due later.
    const existing = new Set(steps.filter((s) => s.slot === slot && countsFrom(s, startDay)).map((s) => s.text.toLowerCase()));
    let room = PLAN_LIMITS.stepsPerSlot - existing.size;
    for (const step of adjustment.add?.[slot] ?? []) {
      if (room <= 0) break;
      if (existing.has(step.text.toLowerCase())) continue;
      existing.add(step.text.toLowerCase());
      room -= 1;
      const created = { id: `s${++n}`, slot, text: step.text, why: step.why ?? '', metric: step.metric ?? null, startDay, endDay: null };
      steps = [...steps, created];
      added.push(created.id);
    }
  }

  return {
    steps,
    version: plan.version + 1,
    adjustments: [
      ...plan.adjustments,
      { version: plan.version + 1, at, day: today, checkInDay, selfieId, source, note: String(adjustment.note ?? '').slice(0, PLAN_LIMITS.summaryLength), dropped, added },
    ],
  };
}

const iso = (d) => (d ? new Date(d).toISOString() : null);

/**
 * The plan as a plain, JSON-safe object for the client: no ObjectIds or Dates,
 * with today's steps, the current phase, progress and the next check-in
 * already worked out.
 */
export function toPlanView(plan, todayKey) {
  const day = getPlanDay(plan, todayKey);
  const expired = day > plan.durationDays;
  const shownDay = clampDay(plan, day);
  const steps = getStepsForDay(plan, shownDay);
  const view = (s) => ({ id: s.id, slot: s.slot, text: s.text, why: s.why || '', metric: s.metric || null, startDay: s.startDay });
  const next = getNextCheckIn(plan);
  const lastDone = [...plan.checkIns].reverse().find((c) => c.status === CHECKIN_STATUS.DONE);
  return {
    id: String(plan._id),
    version: plan.version,
    status: plan.status,
    generatedBy: plan.generatedBy,
    summary: plan.summary || '',
    goals: plan.goals || [],
    day: shownDay,
    durationDays: plan.durationDays,
    monthIndex: plan.monthIndex || 1,
    totalMonths: Math.max(plan.totalMonths || 1, plan.monthIndex || 1),
    daysLeft: Math.max(0, plan.durationDays - shownDay),
    expired,
    phase: getPhaseForDay(plan, shownDay),
    phases: plan.phases,
    steps: { am: steps.am.map(view), pm: steps.pm.map(view) },
    newStepIds: getNewStepIds(plan, shownDay),
    // What unlocks later, grouped by the day it starts (for "what's coming").
    upcoming: [...new Set(plan.steps.filter((x) => x.startDay > shownDay).map((x) => x.startDay))]
      .sort((x, y) => x - y)
      .map((startDay) => ({ startDay, steps: plan.steps.filter((x) => x.startDay === startDay && x.endDay == null).map(view) }))
      .filter((g) => g.steps.length),
    progress: getProgress(plan),
    baseline: plan.baseline,
    // A finished check-in the coach has not answered yet (and there is still plan left to adjust).
    pendingReview: Boolean(lastDone) && !plan.adjustments.some((a) => a.checkInDay === lastDone.day) && shownDay < plan.durationDays,
    nextCheckIn: next ? { day: next.day, dueAt: iso(next.dueAt), isDue: !expired && day >= next.day - CHECKIN_EARLY_DAYS } : null,
    // The last finished check-in came from a scan and has no self-rating yet.
    needsRatings: plan.focus.some((f) => f.scale === 'rating') && Boolean(lastDone) && !Object.keys(lastDone.ratings ?? {}).length,
    checkIns: plan.checkIns.map((c) => ({ day: c.day, status: c.status, completedAt: iso(c.completedAt), overallScore: c.overallScore ?? null, method: c.method ?? null })),
    lastAdjustment: plan.adjustments.length
      ? (({ version, day: adjDay, note }) => ({ version, day: adjDay, note }))(plan.adjustments[plan.adjustments.length - 1])
      : null,
  };
}
