/**
 * The end-of-month review for a longer plan. Pure (no DB, clock or AI), so it
 * is unit-tested.
 *
 * When a month ends we look at what the records show (how the focus areas
 * moved, how often the routine was followed) and PROPOSE changes for the next
 * month in plain words. The person decides: accept the proposals, or carry on
 * unchanged. The server recomputes the proposals itself when they decide, so
 * the client only ever says yes or no.
 */
import { RATING_LABELS } from '../constants/profile.js';
import { getProgress } from './state.js';

/** Below this share of days with a ticked step, next month is kept lighter. */
export const LOW_ADHERENCE = 40;
/** At or above this share, the pace is working. */
export const HIGH_ADHERENCE = 70;

const levels = (n) => `${n} ${Math.abs(n) === 1 ? 'level' : 'levels'}`;
const lower = (s) => String(s).toLowerCase();

function describe(f) {
  if (f.scale === 'rating') {
    if (f.current >= f.target) return { status: 'reached', text: `${f.label} reached its aim: ${RATING_LABELS[f.baseline]} to ${RATING_LABELS[f.current]}.` };
    if (!f.rated) return { status: 'unrated', text: `You didn't rate ${lower(f.label)} this month, so we can't tell how it moved.` };
    if (f.delta > 0) return { status: 'improved', text: `${f.label} moved up ${levels(f.delta)} (${RATING_LABELS[f.baseline]} to ${RATING_LABELS[f.current]}).` };
    if (f.delta < 0) return { status: 'steady', text: `${f.label} dipped a little. That is often down to sleep, stress or lighting, not your plan.` };
    return { status: 'steady', text: `${f.label} has stayed at ${RATING_LABELS[f.current]}.` };
  }
  if (f.current == null) return { status: 'unrated', text: `We have no new scan for ${lower(f.label)} yet.` };
  if (f.percentToTarget >= 100) return { status: 'reached', text: `${f.label} reached its aim (${f.baseline} to ${f.current}).` };
  if (f.delta > 0) return { status: 'improved', text: `${f.label} is up ${f.delta} points (${f.baseline} to ${f.current}).` };
  return { status: 'steady', text: `${f.label} hasn't moved yet (${f.baseline} to ${f.current}).` };
}

/**
 * @param {any} plan the finished (or finishing) month's plan document
 * @param {{ adherencePercent?: number|null }} [opts] share of recent days with a ticked step
 * @returns {{
 *   month: number, totalMonths: number, isFinal: boolean, adherencePercent: number|null,
 *   focus: { metric: string, label: string, status: string, text: string }[],
 *   observations: string[],
 *   proposals: { id: string, kind: 'promote'|'maintain'|'lighter', metric?: string, text: string }[],
 * }}
 */
export function buildMonthReview(plan, { adherencePercent = null } = {}) {
  const month = plan.monthIndex || 1;
  const totalMonths = Math.max(plan.totalMonths || 1, month);
  const focus = getProgress(plan).focus.map((f) => ({ metric: f.metric, label: f.label, ...describe(f) }));

  const observations = focus.map((f) => f.text);
  if (adherencePercent != null) {
    observations.push(
      adherencePercent >= HIGH_ADHERENCE
        ? `You followed your routine on ${adherencePercent}% of recent days. That consistency is what makes the difference.`
        : adherencePercent >= LOW_ADHERENCE
          ? `You followed your routine on ${adherencePercent}% of recent days. A little more regularity will help.`
          : `You followed your routine on ${adherencePercent}% of recent days, so it may have felt like too much.`
    );
  }

  const proposals = [];
  const lowAdherence = adherencePercent != null && adherencePercent < LOW_ADHERENCE;
  if (lowAdherence) {
    proposals.push({ id: 'lighter', kind: 'lighter', text: 'Keep next month lighter, with fewer new steps, so it is easier to stick to.' });
  }
  for (const f of focus) {
    if (f.status === 'reached') {
      proposals.push({ id: `maintain:${f.metric}`, kind: 'maintain', metric: f.metric, text: `Keep ${lower(f.label)} on maintenance and give your other areas the attention.` });
    } else if (f.status === 'steady' && !lowAdherence) {
      proposals.push({ id: `promote:${f.metric}`, kind: 'promote', metric: f.metric, text: `Make ${lower(f.label)} your top priority and bring in its next step sooner.` });
    }
  }
  return { month, totalMonths, isFinal: month >= totalMonths, adherencePercent, focus, observations, proposals };
}

/**
 * Applies accepted proposals to what the next month is built from: the ranked
 * concerns (promoted first, maintained last, otherwise the same order) and the
 * routine length ("lighter" means quick).
 * @param {{ key: string, rating: number }[]} concerns
 * @param {string} routineTime
 * @param {{ kind: string, metric?: string }[]} proposals
 */
export function applyProposals(concerns, routineTime, proposals = []) {
  const promoted = new Set(proposals.filter((p) => p.kind === 'promote').map((p) => p.metric));
  const maintained = new Set(proposals.filter((p) => p.kind === 'maintain').map((p) => p.metric));
  const rank = (c) => (promoted.has(c.key) ? 0 : maintained.has(c.key) ? 2 : 1);
  const ordered = concerns
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
    .map(({ c }) => c);
  return { concerns: ordered, routineTime: proposals.some((p) => p.kind === 'lighter') ? 'quick' : routineTime };
}

/**
 * The routine that is running at the end of a plan, as the base of the next
 * month: steps with no end day and a start day that has passed.
 */
export function carryOverSteps(plan) {
  const live = plan.steps.filter((s) => s.endDay == null && s.startDay <= plan.durationDays);
  const pick = (slot) => live.filter((s) => s.slot === slot).map((s) => ({ text: s.text, why: s.why || '' }));
  return { am: pick('am'), pm: pick('pm') };
}
