/**
 * Pure report logic. A report follows a plan check-in: each completed check-in
 * (day 7 / 14 / 28) unlocks exactly one report that says how the plan is going.
 */
import { CHECKIN_STATUS, METRIC_LABELS, PLAN_METRICS } from '../constants/plan.js';

const isScore = (v) => typeof v === 'number' && Number.isFinite(v);
const idOf = (v) => (v == null ? '' : String(v));

/** Overall change smaller than this reads as "steady" (scores wobble with lighting). */
export const STABLE_BAND = 2;

/**
 * The oldest completed check-in that has no report yet, so none is ever skipped.
 * @param {any[]} plans the user's recent plans
 * @param {{ planId: any, checkInDay: number }[]} reports existing check-in reports
 * @returns {{ plan: any, checkIn: any, prevCheckIn: any|null }|null}
 */
export function findPendingReport(plans, reports) {
  const taken = new Set(reports.map((r) => `${idOf(r.planId)}:${r.checkInDay}`));
  const ordered = [...plans].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  for (const plan of ordered) {
    const done = plan.checkIns.filter((c) => c.status === CHECKIN_STATUS.DONE);
    for (let i = 0; i < done.length; i += 1) {
      if (!taken.has(`${idOf(plan._id)}:${done[i].day}`)) {
        return { plan, checkIn: done[i], prevCheckIn: i > 0 ? done[i - 1] : null };
      }
    }
  }
  return null;
}

/** Status the nav badge, dashboard prompt and reports page read. */
export function getReportStatus(plans, reports) {
  const pending = findPendingReport(plans, reports);
  const active = plans.find((p) => p.status === 'active');
  const next = active?.checkIns.find((c) => c.status === CHECKIN_STATUS.UPCOMING) ?? null;
  return {
    ready: Boolean(pending),
    checkInDay: pending?.checkIn.day ?? null,
    hasPlan: Boolean(active),
    nextCheckInDay: next?.day ?? null,
  };
}

const round = (n) => Math.round(n);

/**
 * Report content for one check-in, compared with the previous check-in or, for
 * the first one, the plan's starting point.
 * @returns {{ title: string, summary: string, highlights: string[], compliments: string[], averageScore: number|null, trend: 'improving'|'declining'|'stable', trendValue: number }}
 */
export function buildCheckInReport(plan, checkIn, prevCheckIn, { dateLabel = '' } = {}) {
  const ref = prevCheckIn ?? plan.baseline ?? {};
  const refScores = ref.scores ?? {};
  const scores = checkIn.scores ?? {};
  const current = isScore(checkIn.overallScore) ? round(checkIn.overallScore) : null;
  const before = isScore(ref.overallScore) ? round(ref.overallScore) : null;
  const delta = current != null && before != null ? current - before : 0;
  const trend = Math.abs(delta) < STABLE_BAND ? 'stable' : delta > 0 ? 'improving' : 'declining';
  const since = prevCheckIn ? `your day ${prevCheckIn.day} check-in` : 'your starting point';

  const change =
    current == null ? 'Your scan was saved.'
      : before == null ? `Your overall score is ${current}.`
        : trend === 'stable' ? `Your overall score is ${current}, steady since ${since}.`
          : `Your overall score is ${current}, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} since ${since}.`;

  const focusLines = (plan.focus ?? [])
    .filter((f) => isScore(scores[f.metric]))
    .map((f) => `${f.label || METRIC_LABELS[f.metric]} ${round(refScores[f.metric] ?? f.baseline)} → ${round(scores[f.metric])} (aim ${f.target})`);

  const highlights = PLAN_METRICS
    .filter((m) => isScore(scores[m]))
    .map((m) => ({ m, v: round(scores[m]) }))
    .sort((a, b) => b.v - a.v)
    .map(({ m, v }) => `${METRIC_LABELS[m]}: ${v}/100`);

  const compliments = {
    improving: ['Your plan is showing up in your skin. Keep the routine going.', 'Small, steady changes add up. This is what progress looks like.'],
    stable: ['Holding steady is normal early on. Skin takes weeks to change.', 'Keep the routine consistent; the next check-in is where changes show.'],
    declining: ['Scores move with lighting and sleep, so one dip is not a verdict.', 'Scan in the same spot and light next time, and keep the routine going.'],
  }[trend];

  return {
    title: `Day ${checkIn.day} Check-in Report${dateLabel ? ` · ${dateLabel}` : ''}`,
    summary: [change, focusLines.length ? `Focus areas: ${focusLines.join('; ')}.` : ''].filter(Boolean).join(' '),
    highlights,
    compliments,
    averageScore: current,
    trend,
    trendValue: Math.abs(delta),
  };
}
