/**
 * Bringing a running plan in line with updated skin-profile answers, without
 * starting over. Pure (no DB or clock), so it is unit-tested.
 *
 * Two operations:
 *  - `endUnsafeSteps`: the safety sweep. Anything in the plan the engine would
 *    now refuse (for example a retinoid after "pregnant: yes") stops today.
 *  - `mergePlanWithProfile`: re-plans the REST of the plan from the new
 *    answers. Day, check-ins, ticks and progress are kept; steps that still fit
 *    are kept as they are (same id, so ticks stay valid); steps that no longer
 *    fit end; new steps start tomorrow at the earliest.
 */
import { PLAN_PHASES, PLAN_SLOTS, PLAN_LIMITS } from '../constants/plan.js';
import { buildDraft, buildFocus, classifyProfile, filterSafeSteps, ratingTarget } from './engine.js';
import { sanitizeDraft } from './build.js';

const isActiveOn = (step, day) => step.startDay <= day && (step.endDay == null || day <= step.endDay);
/** Active today, or still to start (and not already cancelled). */
const isLive = (step, today) => (step.startDay > today ? step.endDay == null || step.endDay >= step.startDay : isActiveOn(step, today));
const clampDay = (plan, day) => Math.min(Math.max(day, 1), plan.durationDays);
const idNumber = (id) => Number(String(id).slice(1)) || 0;

/**
 * Stops a step. A step still to start never starts; a running one ends
 * yesterday (`now`, for unsafe steps) or today (the default, so today's tick
 * still counts and the change lands tomorrow).
 */
function stop(step, today, now = false) {
  if (step.startDay > today) return { ...step, endDay: step.startDay - 1 };
  return { ...step, endDay: now ? today - 1 : today };
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
  return { steps: plan.steps.map((s) => (stopped.includes(s.id) ? stop(s, today, true) : s)), stopped };
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

  const key = (s) => `${s.slot}:${s.text.toLowerCase()}`;
  const live = plan.steps.filter((s) => isLive(s, today));
  const liveByKey = new Map(live.map((s) => [key(s), s]));
  const wantedKeys = new Set(wanted.map(key));

  const stopped = live.filter((s) => !wantedKeys.has(key(s))).map((s) => s.id);
  let steps = plan.steps.map((s) => (stopped.includes(s.id) ? stop(s, today) : s));

  let n = steps.reduce((max, s) => Math.max(max, idNumber(s.id)), 0);
  const added = [];
  for (const w of wanted) {
    if (liveByKey.has(key(w))) continue;
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
        { version, at, day: today, checkInDay: null, selfieId: null, note: 'Updated to match your new answers.', dropped: stopped, added },
      ],
    },
    added,
    stopped,
  };
}
