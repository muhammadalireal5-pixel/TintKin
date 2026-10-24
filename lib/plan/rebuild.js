/**
 * Bringing a running plan in line with updated skin-profile answers, without
 * starting over. Pure (no DB or clock), so it is unit-tested.
 *
 * Two operations:
 *  - `endUnsafeSteps`: the safety sweep. Anything in the plan the engine would
 *    now refuse (for example a retinoid after "pregnant: yes") stops at once.
 *  - `mergePlanWithProfile`: re-plans the REST of the plan from the new
 *    answers. Day, check-ins, ticks and progress are kept; steps that still fit
 *    are kept as they are (same id, so ticks stay valid); steps that no longer
 *    fit end; new steps start tomorrow at the earliest. What the person chose
 *    themselves is respected: steps Kin or a check-in added are kept, and steps
 *    they asked to drop do not come back.
 */
import { PLAN_PHASES, PLAN_SLOTS, PLAN_LIMITS } from '../constants/plan.js';
import { buildDraft, buildFocus, classifyProfile, filterSafeSteps, ratingTarget } from './engine.js';
import { sanitizeDraft } from './build.js';
import { isLive, stopStep } from './state.js';

const clampDay = (plan, day) => Math.min(Math.max(day, 1), plan.durationDays);
const idNumber = (id) => Number(String(id).slice(1)) || 0;
const keyOf = (s) => `${s.slot}:${s.text.toLowerCase()}`;

/** Changes the engine made itself; everything else was the person's (or their coach's) choice. */
const isEngineSource = (a) => a.source === 'profile' || a.source === 'safety';

/**
 * The person's own choices so far: ids of steps added by Kin or a check-in,
 * and the slot+text of steps they had dropped.
 */
function customisations(plan) {
  const chosen = new Set();
  const declined = new Set();
  const byId = new Map(plan.steps.map((s) => [s.id, s]));
  for (const a of plan.adjustments ?? []) {
    if (isEngineSource(a)) continue;
    for (const id of a.added ?? []) chosen.add(id);
    for (const id of a.dropped ?? []) {
      const step = byId.get(id);
      if (step) declined.add(keyOf(step));
    }
  }
  return { chosen, declined };
}

/**
 * The safety sweep. Steps that are active now or still to come and that the
 * safety rules refuse for this profile are stopped immediately.
 * @returns {{ steps: any[], stopped: string[] }}
 */
export function endUnsafeSteps(plan, user, day) {
  const today = clampDay(plan, day);
  const live = plan.steps.filter((s) => isLive(s, today));
  const safe = new Set(filterSafeSteps(live, user).map((s) => s.id));
  const stopped = live.filter((s) => !safe.has(s.id)).map((s) => s.id);
  if (!stopped.length) return { steps: plan.steps, stopped };
  return { steps: plan.steps.map((s) => (stopped.includes(s.id) ? stopStep(s, today, true) : s)), stopped };
}

/**
 * Re-plans the rest of the plan from the user's current answers.
 * @returns {{ set: object, added: string[], stopped: string[] }|null} null when
 *   the plan has no days left to change.
 */
export function mergePlanWithProfile(plan, user, day, { at = new Date() } = {}) {
  if (day >= plan.durationDays) return null;
  const today = clampDay(plan, day);
  const profile = classifyProfile(user);
  const draft = sanitizeDraft(buildDraft(user));
  const { chosen, declined } = customisations(plan);

  // What the new answers want, in the same order and limits buildPlan uses.
  const wanted = [];
  for (const phase of PLAN_PHASES) {
    for (const slot of PLAN_SLOTS) {
      const room = PLAN_LIMITS.stepsPerSlot - wanted.filter((w) => w.slot === slot).length;
      for (const step of (draft.phases[phase.key]?.[slot] ?? []).slice(0, Math.max(0, room))) {
        wanted.push({ ...step, slot, phaseStart: phase.startDay });
      }
    }
  }

  const live = plan.steps.filter((s) => isLive(s, today));
  const liveKeys = new Set(live.map(keyOf));
  const wantedKeys = new Set(wanted.map(keyOf));

  // A step the person added themselves stays unless the safety rules refuse it now.
  const unsafe = new Set(live.filter((s) => chosen.has(s.id)).map((s) => s.id));
  for (const s of filterSafeSteps(live.filter((x) => chosen.has(x.id)), user)) unsafe.delete(s.id);

  const stopped = live
    .filter((s) => (chosen.has(s.id) ? unsafe.has(s.id) : !wantedKeys.has(keyOf(s))))
    .map((s) => s.id);
  let steps = plan.steps.map((s) => (stopped.includes(s.id) ? stopStep(s, today) : s));

  let n = steps.reduce((max, s) => Math.max(max, idNumber(s.id)), 0);
  const added = [];
  for (const w of wanted) {
    if (liveKeys.has(keyOf(w)) || declined.has(keyOf(w))) continue;
    const created = {
      id: `s${++n}`,
      slot: w.slot,
      text: w.text,
      why: w.why ?? '',
      metric: w.metric ?? null,
      // Never earlier than tomorrow, and never before its phase would have started.
      startDay: Math.min(Math.max(w.phaseStart, today + 1), plan.durationDays),
      endDay: null,
    };
    steps = [...steps, created];
    added.push(created.id);
  }

  // Focus follows the new priorities; progress already made on a kept concern is kept.
  const oldByMetric = new Map((plan.focus ?? []).filter((f) => f.scale === 'rating').map((f) => [f.metric, f]));
  const focus = buildFocus(profile).map((f) => {
    const old = oldByMetric.get(f.metric);
    return old ? { ...f, baseline: old.baseline, target: ratingTarget(old.baseline) } : f;
  });
  const ratings = { ...Object.fromEntries(focus.map((f) => [f.metric, f.baseline])), ...(plan.baseline?.ratings ?? {}) };

  const version = plan.version + 1;
  return {
    set: {
      steps,
      focus,
      summary: draft.summary || plan.summary,
      goals: Array.isArray(user.goals) ? user.goals.filter((g) => typeof g === 'string').slice(0, 10) : plan.goals,
      'baseline.ratings': ratings,
      version,
      adjustments: [
        ...plan.adjustments,
        { version, at, day: today, checkInDay: null, selfieId: null, source: 'profile', note: 'Updated to match your new answers.', dropped: stopped, added },
      ],
    },
    added,
    stopped,
  };
}
