/**
 * Pure report logic. A report follows a plan check-in: each completed check-in
 * (day 7 / 14 / 28) unlocks exactly one report that says how the plan is going.
 */
import { CHECKIN_STATUS, METRIC_LABELS, PLAN_METRICS } from '../constants/plan.js';
import { CONCERNS } from '../constants/profile.js';

const isScore = (v) => typeof v === 'number' && Number.isFinite(v);
const idOf = (v) => (v == null ? '' : String(v));

/** Overall change smaller than this reads as "steady" (scores wobble with lighting). */
export const STABLE_BAND = 2;

/**
 * The oldest completed check-in that has no report yet, so none is ever skipped.
 * On self-rated plans a check-in only counts once it has ratings.
 * @param {any[]} plans the user's recent plans
 * @param {{ planId: any, checkInDay: number }[]} reports existing check-in reports
 * @returns {{ plan: any, checkIn: any, prevCheckIn: any|null }|null}
 */
export function findPendingReport(plans, reports) {
  const taken = new Set(reports.map((r) => `${idOf(r.planId)}:${r.checkInDay}`));
  const ordered = [...plans].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  for (const plan of ordered) {
    const done = plan.checkIns.filter((c) => c.status === CHECKIN_STATUS.DONE);
    const rated = plan.focus?.some((f) => f.scale === 'rating');
    for (let i = 0; i < done.length; i += 1) {
      // A scan-completed check-in waits for the person's ratings: the report is
      // one-per-check-in, so generating it early would freeze it without them.
      if (rated && !Object.keys(done[i].ratings ?? {}).length) continue;
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

/** Mean of a ratings object (1-5) on a 0-100 scale, or null. */
function ratingsOverall(ratings) {
  const v = Object.values(ratings ?? {}).filter((x) => Number.isFinite(x));
  return v.length ? round((v.reduce((a, b) => a + b, 0) / v.length) * 20) : null;
}

/**
 * Report content for one check-in, compared with the previous check-in or, for
 * the first one, the plan's starting point. Plans made from self-ratings report
 * the ratings (scaled to 0-100); a scan, when there was one, adds measured numbers.
 * @returns {{ title: string, summary: string, highlights: string[], compliments: string[], averageScore: number|null, trend: 'improving'|'declining'|'stable', trendValue: number }}
 */
export function buildCheckInReport(plan, checkIn, prevCheckIn, { dateLabel = '' } = {}) {
  const rated = plan.focus?.some((f) => f.scale === 'rating');
  const ref = prevCheckIn ?? plan.baseline ?? {};
  const refScores = ref.scores ?? {};
  const scores = checkIn.scores ?? {};
  const refRatings = prevCheckIn?.ratings && Object.keys(prevCheckIn.ratings).length ? prevCheckIn.ratings : plan.baseline?.ratings ?? {};
  const ratings = checkIn.ratings ?? {};

  const nowOverall = rated ? ratingsOverall(ratings) : null;
  const current = nowOverall ?? (isScore(checkIn.overallScore) ? round(checkIn.overallScore) : null);
  const beforeRaw = rated && nowOverall != null ? ratingsOverall(refRatings) : ref.overallScore;
  const before = isScore(beforeRaw) ? round(beforeRaw) : null;
  const delta = current != null && before != null ? current - before : 0;
  const trend = Math.abs(delta) < STABLE_BAND ? 'stable' : delta > 0 ? 'improving' : 'declining';
  const since = prevCheckIn ? `your day ${prevCheckIn.day} check-in` : 'your starting point';
  const noun = rated && nowOverall != null ? 'skin rating' : 'overall score';

  const change =
    current == null ? 'Your check-in was saved.'
      : before == null ? `Your ${noun} is ${current}.`
        : trend === 'stable' ? `Your ${noun} is ${current}, steady since ${since}.`
          : `Your ${noun} is ${current}, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} since ${since}.`;

  const focusLines = (plan.focus ?? []).flatMap((f) => {
    const label = f.label || METRIC_LABELS[f.metric] || f.metric;
    if (f.scale === 'rating') {
      if (!isScore(ratings[f.metric])) return [];
      return [`${label} ${refRatings[f.metric] ?? f.baseline} → ${ratings[f.metric]} of 5 (aim ${f.target})`];
    }
    if (!isScore(scores[f.metric])) return [];
    return [`${label} ${round(refScores[f.metric] ?? f.baseline)} → ${round(scores[f.metric])} (aim ${f.target})`];
  });

  // Measured numbers from a scan, where the plan has a scan baseline to compare with.
  const measured = rated
    ? (plan.focus ?? []).flatMap((f) => {
        const m = CONCERNS[f.metric]?.scanMetric;
        const from = m ? plan.baseline?.scores?.[m] : null;
        return m && isScore(scores[m]) && isScore(from) ? [`${METRIC_LABELS[m]} ${round(from)} → ${round(scores[m])}`] : [];
      })
    : [];

  const metricHighlights = PLAN_METRICS
    .filter((m) => isScore(scores[m]))
    .map((m) => ({ label: METRIC_LABELS[m], v: round(scores[m]) }));
  const ratingHighlights = rated
    ? (plan.focus ?? []).filter((f) => isScore(ratings[f.metric])).map((f) => ({ label: f.label, v: ratings[f.metric] * 20 }))
    : [];
  const highlights = [...ratingHighlights, ...metricHighlights]
    .sort((a, b) => b.v - a.v)
    .map(({ label, v }) => `${label}: ${v}/100`);

  const compliments = {
    improving: ['Your plan is showing up in your skin. Keep the routine going.', 'Small, steady changes add up. This is what progress looks like.'],
    stable: ['Holding steady is normal early on. Skin takes weeks to change.', 'Keep the routine consistent; the next check-in is where changes show.'],
    declining: ['Ratings move with sleep, stress and lighting, so one dip is not a verdict.', 'Keep the routine going and rate again at your next check-in.'],
  }[trend];

  return {
    title: `Day ${checkIn.day} Check-in Report${dateLabel ? ` · ${dateLabel}` : ''}`,
    summary: [
      change,
      focusLines.length ? `Focus areas: ${focusLines.join('; ')}.` : '',
      measured.length ? `Measured by your scan: ${measured.join('; ')}.` : '',
    ].filter(Boolean).join(' '),
    highlights,
    compliments,
    averageScore: current,
    trend,
    trendValue: Math.abs(delta),
  };
}
