import {
  KNOWLEDGE_VERSION,
  INGREDIENT_CLASSES,
  LADDERS,
  WEEK_PATTERNS,
  COACH_RULES,
  SERIOUS_REACTIONS,
  REACTION_LEVELS,
  classOf,
  conflicts,
} from './knowledge.js';

export const COACH_VERSION = 1;

export function newCoach() {
  return { version: COACH_VERSION, knowledgeVersion: KNOWLEDGE_VERSION, ladders: {}, pausedFrom: null, pausedUntilDay: null, reactions: [] };
}

export const hasCoach = (plan) => Boolean(plan?.coach?.version);

const isActiveOn = (step, day) => step.startDay <= day && (step.endDay == null || day <= step.endDay);

const FREQUENCY_WORDS = /\s*(once a week to start, then twice|two evenings a week|two evenings this week|on two evenings this week|on two evenings a week|once a week)\b/gi;

export function coachFields(text, startRung = null) {
  const cls = classOf(text);
  const ladder = INGREDIENT_CLASSES[cls]?.ladder ?? null;
  if (!ladder) return { cls, ladder: null, startRung: null };
  const max = LADDERS[ladder].rungs.length - 1;
  const n = Number.isInteger(startRung) ? Math.min(Math.max(startRung, 0), max) : 0;
  return { cls, ladder, startRung: n };
}

export function upgradeToCoach(plan) {
  const steps = plan.steps.map((s) => {
    if (s.ladder !== undefined && s.ladder !== null) return s;
    const twice = /two evenings/i.test(s.text);
    const fields = coachFields(s.text, twice ? 1 : 0);
    if (!fields.ladder) return { ...s, cls: fields.cls ?? s.cls ?? null, ladder: null, startRung: null };
    const text = s.text.replace(FREQUENCY_WORDS, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
    return { ...s, ...fields, text };
  });
  return { steps, coach: newCoach() };
}

export function ladderState(plan, step) {
  const saved = plan.coach?.ladders?.[step.id];
  if (saved && Number.isInteger(saved.rung)) return { rung: saved.rung, since: saved.since ?? step.startDay };
  return { rung: step.startRung ?? 0, since: step.startDay };
}

export function nightsPerWeek(plan, step) {
  const ladder = LADDERS[step.ladder];
  if (!ladder) return 7;
  const { rung } = ladderState(plan, step);
  return ladder.rungs[Math.min(Math.max(rung, 0), ladder.rungs.length - 1)];
}

function onPattern(plan, step, day) {
  const n = nightsPerWeek(plan, step);
  if (n >= 7) return true;
  const { since } = ladderState(plan, step);
  const pos = (((day - since) % 7) + 7) % 7;
  return WEEK_PATTERNS[n].includes(pos);
}

export function isPaused(plan, day) {
  const c = plan.coach;
  return Boolean(c?.pausedUntilDay != null && day >= (c.pausedFrom ?? 0) && day <= c.pausedUntilDay);
}

export function composeDay(plan, day) {
  const active = plan.steps.filter((s) => isActiveOn(s, day));
  if (!hasCoach(plan)) {
    return { am: active.filter((s) => s.slot === 'am'), pm: active.filter((s) => s.slot === 'pm'), off: [] };
  }
  const paused = isPaused(plan, day);
  const placed = { am: [], pm: [] };
  const off = [];
  const ordered = [...active].sort((a, b) => (Number(String(a.id).slice(1)) || 0) - (Number(String(b.id).slice(1)) || 0));
  for (const step of ordered) {
    if (!step.ladder) {
      placed[step.slot].push(step);
      continue;
    }
    if (paused) {
      off.push({ step, reason: 'paused', nextDay: nextScheduledDay(plan, step, plan.coach.pausedUntilDay + 1) });
      continue;
    }
    if (!onPattern(plan, step, day)) {
      off.push({ step, reason: 'rest', nextDay: nextScheduledDay(plan, step, day + 1) });
      continue;
    }
    const clash = placed[step.slot].some((other) => other.ladder && conflicts(other.cls, step.cls));
    if (clash) {
      off.push({ step, reason: 'conflict', nextDay: nextScheduledDay(plan, step, day + 1) });
      continue;
    }
    placed[step.slot].push(step);
  }
  const byOrder = (list) => active.filter((s) => list.includes(s));
  return { am: byOrder(placed.am), pm: byOrder(placed.pm), off };
}

function nextScheduledDay(plan, step, fromDay) {
  for (let d = fromDay; d < fromDay + 14; d++) {
    if (d > plan.durationDays) return null;
    if (step.endDay != null && d > step.endDay) return null;
    if (onPattern(plan, step, d)) return d;
  }
  return null;
}

export function isScheduledOn(plan, step, day) {
  const { am, pm } = composeDay(plan, day);
  return [...am, ...pm].some((s) => s.id === step.id);
}

const recentReactions = (plan, fromDay, toDay) =>
  (plan.coach?.reactions ?? []).filter((r) => r.day >= fromDay && r.day <= toDay);

export function computeReadiness(plan, day, { lifestyle = null } = {}) {
  if (!hasCoach(plan)) return { level: 'green', reasons: [] };
  if (isPaused(plan, day)) {
    return {
      level: 'red',
      reasons: [`Your skin reacted on day ${plan.coach.pausedFrom}, so actives rest until day ${plan.coach.pausedUntilDay + 1}. Barrier care only.`],
    };
  }
  const reasons = [];
  for (const step of plan.steps.filter((s) => s.ladder && isActiveOn(s, day))) {
    const { rung, since } = ladderState(plan, step);
    if (day - since < COACH_RULES.newRungAmberDays) {
      const label = INGREDIENT_CLASSES[step.cls]?.label ?? 'A new active';
      reasons.push(since === step.startDay && rung === (step.startRung ?? 0)
        ? `${label} is new this week, so we hold it steady.`
        : `${label} just moved to ${nightsPerWeek(plan, step)} nights a week. We hold it there for now.`);
    }
  }
  if (recentReactions(plan, day - 2, day).some((r) => r.level === 'tingle')) reasons.push('A tingle in the last few days: we hold your actives where they are.');
  if (lifestyle?.sleep === 'under6') reasons.push('Short sleep lately: an easy day, no step-ups.');
  if (lifestyle?.stress === 'high') reasons.push('High stress lately: an easy day, no step-ups.');
  return reasons.length ? { level: 'amber', reasons } : { level: 'green', reasons: [] };
}

export function applyReaction(plan, { day, level, slot = null, at = new Date() }) {
  if (!REACTION_LEVELS.includes(level)) throw new Error('Unknown reaction');
  const coach = structuredCloneCoach(plan.coach ?? newCoach());
  const suspects = plan.steps.filter((s) =>
    s.ladder && (slot == null || s.slot === slot) && [day, day - 1].some((d) => isActiveOn(s, d) && isScheduledOn(plan, s, d))
  );
  const classes = [...new Set(suspects.map((s) => s.cls))];
  const serious = SERIOUS_REACTIONS.has(level);
  const repeatClasses = serious
    ? classes.filter((cls) => coach.reactions.some((r) => SERIOUS_REACTIONS.has(r.level) && r.day >= day - COACH_RULES.repeatReactionWindowDays && (r.classes ?? []).includes(cls)))
    : [];
  coach.reactions = [...coach.reactions, { day, level, slot, classes, at }].slice(-60);
  if (serious) {
    coach.pausedFrom = day;
    coach.pausedUntilDay = day + COACH_RULES.pauseDaysAfterReaction;
    for (const step of plan.steps.filter((s) => s.ladder && isActiveOn(s, day))) {
      const { rung } = ladderState({ ...plan, coach }, step);
      coach.ladders[step.id] = { rung: Math.max(0, rung - 1), since: coach.pausedUntilDay + 1 };
    }
  }
  return { coach, serious, repeatClasses, suspectIds: suspects.map((s) => s.id) };
}

function structuredCloneCoach(c) {
  return {
    version: c.version ?? COACH_VERSION,
    knowledgeVersion: c.knowledgeVersion ?? KNOWLEDGE_VERSION,
    ladders: Object.fromEntries(Object.entries(c.ladders ?? {}).map(([k, v]) => [k, { ...v }])),
    pausedFrom: c.pausedFrom ?? null,
    pausedUntilDay: c.pausedUntilDay ?? null,
    reactions: (c.reactions ?? []).map((r) => ({ ...r, classes: [...(r.classes ?? [])] })),
  };
}

export function advanceLadders(plan, day, done, { readiness = null } = {}) {
  if (!hasCoach(plan)) return null;
  const level = readiness?.level ?? computeReadiness(plan, day).level;
  if (level !== 'green') return null;
  const coach = structuredCloneCoach(plan.coach);
  const steppedUp = [];
  for (const step of plan.steps.filter((s) => s.ladder && isActiveOn(s, day))) {
    const ladder = LADDERS[step.ladder];
    const { rung, since } = ladderState(plan, step);
    if (rung >= ladder.rungs.length - 1) continue;
    if (day - since < ladder.minDays) continue;
    const quietFrom = Math.min(since, day - ladder.minDays - COACH_RULES.pauseDaysAfterReaction);
    if (recentReactions(plan, quietFrom, day).some((r) => r.level !== 'fine')) continue;
    const from = Math.max(since, day - 14, step.startDay);
    let scheduled = 0;
    let ticked = 0;
    for (let d = from; d < day; d++) {
      if (!isScheduledOn(plan, step, d)) continue;
      scheduled += 1;
      if (done(d, step.id)) ticked += 1;
    }
    if (scheduled < 2 || ticked / scheduled < COACH_RULES.stepUpMinAdherence) continue;
    coach.ladders[step.id] = { rung: rung + 1, since: day };
    steppedUp.push({ id: step.id, nights: ladder.rungs[rung + 1] });
  }
  return steppedUp.length ? { coach, steppedUp } : null;
}

export function scheduleLabel(plan, step) {
  if (!hasCoach(plan) || !step.ladder) return null;
  const n = nightsPerWeek(plan, step);
  const when = step.slot === 'am' ? 'mornings' : 'nights';
  return n >= 7 ? `Every ${step.slot === 'am' ? 'morning' : 'night'}` : `${n} ${n === 1 ? when.slice(0, -1) : when} a week`;
}
