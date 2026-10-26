import { IMPACT_KEYS } from './lifestyle.js';

const RANK = { low: 0, limited: 1, high: 2 };
const worst = (a, b) => (RANK[a] <= RANK[b] ? a : b);

export const SCORE_BAND = 1.5;

/**
 * How much weight a projection can bear.
 *  - scores: needs the person's own scan history (velocitySource) and known inputs.
 *  - skinAge: depends only on the lifestyle inputs and what is being tried.
 * 'high' shows numbers, 'limited' shows them as ranges, 'low' hides them.
 * @param {{ velocitySource?: string, sources?: Record<string, string> }} args
 */
export function assessReliability({ velocitySource = 'baseline', sources = {} } = {}) {
  const scans = velocitySource === 'user' ? 'high' : velocitySource === 'blended' ? 'limited' : 'low';
  const assumed = IMPACT_KEYS.filter((k) => sources[k] === 'default');
  const inputs = assumed.length >= 2 ? 'low' : assumed.length === 1 ? 'limited' : 'high';
  return {
    scores: worst(scans, inputs),
    skinAge: inputs,
    scansBasis: scans,
    assumedInputs: assumed,
    anyAssumed: Object.values(sources).some((s) => s === 'default'),
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

/** A score as the UI should show it, given how reliable the projection is. */
export function presentScore(value, level) {
  if (typeof value !== 'number' || level === 'low') return { hidden: true };
  if (level === 'limited') return { hidden: false, approximate: true, text: `about ${Math.round(value)}` };
  return { hidden: false, approximate: false, text: String(value) };
}

/** A difference between two scenarios, widened to a range when the projection is only indicative. */
export function presentDelta(value, level) {
  if (typeof value !== 'number' || level === 'low') return { hidden: true };
  if (level === 'limited') {
    const lo = round1(value - SCORE_BAND);
    const hi = round1(value + SCORE_BAND);
    const fmt = (n) => (n > 0 ? `+${n}` : String(n));
    return { hidden: false, approximate: true, text: `${fmt(lo)} to ${fmt(hi)}` };
  }
  return { hidden: false, approximate: false, text: value > 0 ? `+${value}` : String(value) };
}
