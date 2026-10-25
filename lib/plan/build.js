/**
 * Pure plan construction: no DB, clock, or network access, so it is unit-tested
 * in tests/plan.test.mjs. The AI proposes a "draft" (summary + steps per
 * phase); everything here bounds it, gives each step a stable id, and falls
 * back to a rule-based draft when the AI is unavailable or returns junk.
 */
import {
  PLAN_DURATION_DAYS,
  PLAN_STATUS,
  CHECKIN_STATUS,
  CHECKIN_DAYS,
  PLAN_METRICS,
  STEP_METRICS,
  METRIC_LABELS,
  PLAN_FOCUS_COUNT,
  PLAN_PHASES,
  PLAN_SLOTS,
  PLAN_LIMITS,
} from '../constants/plan.js';

const DAY_MS = 86400000;
const isScore = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * A realistic 30-day aim: roughly 15% of the gap to 100, never under +3, and
 * capped at 95 so the target is never "perfect skin".
 * @param {number} baseline 0-100
 */
export function computeTarget(baseline) {
  const gain = Math.max(3, Math.round((100 - baseline) * 0.15));
  return Math.min(95, Math.round(baseline) + gain);
}

/**
 * The weakest metrics become the plan's focus, each with a target.
 * @param {Record<string, number|null|undefined>} scores
 * @returns {{ metric: string, label: string, baseline: number, target: number }[]}
 */
export function pickFocus(scores = {}) {
  return PLAN_METRICS
    .filter((m) => isScore(scores[m]))
    .sort((a, b) => scores[a] - scores[b])
    .slice(0, PLAN_FOCUS_COUNT)
    .map((metric) => {
      const baseline = Math.round(scores[metric]);
      return { metric, label: METRIC_LABELS[metric], baseline, target: computeTarget(baseline), scale: 'score' };
    });
}

const clean = (value, max) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

function cleanStep(raw) {
  if (typeof raw === 'string') raw = { text: raw };
  if (!raw || typeof raw !== 'object') return null;
  const text = clean(raw.text, PLAN_LIMITS.textLength);
  if (!text) return null;
  return {
    text,
    why: clean(raw.why, PLAN_LIMITS.whyLength),
    metric: STEP_METRICS.includes(raw.metric) ? raw.metric : null,
  };
}

/** Bounds a list of AI steps: valid shape, trimmed, de-duplicated, capped. */
export function cleanStepList(list, max) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const step = cleanStep(raw);
    if (!step) continue;
    const key = step.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(step);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Normalises an AI draft: { summary, phases: { [phaseKey]: { am: [], pm: [] } } }.
 * The first phase is the base routine; later phases list only what they ADD.
 * @returns {{ summary: string, phases: Record<string, { am: any[], pm: any[] }> }}
 */
export function sanitizeDraft(draft) {
  const phases = {};
  for (const phase of PLAN_PHASES) {
    const raw = draft?.phases?.[phase.key] ?? {};
    const max = phase.startDay === 1 ? PLAN_LIMITS.stepsPerSlot : PLAN_LIMITS.addsPerPhase;
    phases[phase.key] = {
      am: cleanStepList(raw.am, max),
      pm: cleanStepList(raw.pm, max),
    };
  }
  return { summary: clean(draft?.summary, PLAN_LIMITS.summaryLength), phases };
}

/**
 * Normalises an AI adjustment: { note, drop: [stepId], add: { am: [], pm: [] } }.
 * Unknown step ids are ignored later by applyAdjustment (it only ends steps
 * that are really active), so only the shape is bounded here.
 */
export function sanitizeAdjustment(raw) {
  const drop = Array.isArray(raw?.drop)
    ? [...new Set(raw.drop.filter((id) => typeof id === 'string' && /^s\d{1,4}$/.test(id)))].slice(0, 12)
    : [];
  return {
    note: clean(raw?.note, PLAN_LIMITS.summaryLength),
    drop,
    add: {
      am: cleanStepList(raw?.add?.am, PLAN_LIMITS.addsPerPhase),
      pm: cleanStepList(raw?.add?.pm, PLAN_LIMITS.addsPerPhase),
    },
  };
}

const FOCUS_STEPS = {
  radiance: {
    pm: { text: 'Gently exfoliate on two evenings this week, then moisturise', why: 'Clears dull surface cells so your skin reflects more light.' },
    am: { text: 'Add a brightening serum before moisturiser', why: 'Supports an even, glowing tone through the day.' },
  },
  spots: {
    am: { text: 'Apply a brightening serum and re-apply sunscreen outdoors', why: 'Sun exposure darkens spots, so protection is what lets them fade.' },
    pm: { text: 'Use a gentle brightening treatment on clean skin', why: 'Targets uneven pigment while you sleep.' },
  },
  wrinkles: {
    pm: { text: 'Introduce a gentle retinoid on two evenings a week, then build up slowly', why: 'Supports smoother-looking skin over time.' },
    am: { text: 'Layer a hydrating serum under your moisturiser', why: 'Plump, hydrated skin shows fine lines less.' },
  },
  firmness: {
    pm: { text: 'Use a peptide or retinoid-based moisturiser at night', why: 'Supports your skin’s firmness while you rest.' },
    am: { text: 'Use a hydrating serum and finish with moisturiser', why: 'Keeps skin bouncy and supple through the day.' },
  },
};

/**
 * Rule-based draft used when the AI is unavailable. Deliberately plain: it is a
 * safe, gentle routine whose targeted steps follow the weakest metrics.
 */
export function fallbackDraft(scores = {}) {
  const focus = pickFocus(scores);
  const first = focus[0]?.metric;
  const second = focus[1]?.metric;
  const targeted = (metric, slot) => {
    const step = metric && FOCUS_STEPS[metric]?.[slot];
    return step ? [{ ...step, metric }] : [];
  };
  return {
    summary: focus.length
      ? `Your plan starts gently, then targets ${focus.map((f) => f.label.toLowerCase()).join(' and ')}. Check in with a scan each week to see it move.`
      : 'Your plan starts gently, then builds. Check in with a scan each week to see it move.',
    phases: {
      foundation: {
        am: [
          { text: 'Cleanse with a gentle cleanser', why: 'Removes overnight build-up without stripping your skin barrier.' },
          { text: 'Moisturise', why: 'Keeps your skin barrier strong and hydrated.' },
          { text: 'Apply sunscreen', why: 'Daily protection is the biggest lever for how your skin ages.' },
        ],
        pm: [
          { text: 'Cleanse your face', why: 'Clears sunscreen, oil and pollution from the day.' },
          { text: 'Moisturise before bed', why: 'Skin repairs overnight, so give it moisture to work with.' },
        ],
      },
      target: { am: [], pm: targeted(first, 'pm') },
      build: { am: targeted(first, 'am'), pm: [] },
      lockin: { am: [], pm: targeted(second, 'pm') },
    },
  };
}

/**
 * Turns a sanitized draft into the stored plan document. Later phases only add
 * steps, so a step keeps its id (and its tick history) for as long as it lives.
 * @param {object} args
 * @param {ReturnType<typeof sanitizeDraft>} args.draft
 * @param {Record<string, number|null>} args.scores
 * @param {string} args.startDayKey local day key of plan day 1
 * @param {Date} args.startedAt
 * @param {'ai'|'fallback'} [args.generatedBy]
 */
export function buildPlan({ draft, scores = {}, overallScore = null, skinAge = null, goals = [], startDayKey, startedAt, selfieId = null, generatedBy = 'ai', focus = null, ratings = null, monthIndex = 1, totalMonths = 1 }) {
  let usable = draft;
  let source = generatedBy;
  const foundation = draft?.phases?.foundation;
  if (!foundation || !foundation.am.length || !foundation.pm.length) {
    usable = sanitizeDraft(fallbackDraft(scores));
    source = 'fallback';
  }

  const steps = [];
  let n = 0;
  for (const phase of PLAN_PHASES) {
    for (const slot of PLAN_SLOTS) {
      const room = PLAN_LIMITS.stepsPerSlot - steps.filter((s) => s.slot === slot).length;
      for (const step of (usable.phases[phase.key]?.[slot] ?? []).slice(0, Math.max(0, room))) {
        steps.push({ id: `s${++n}`, slot, text: step.text, why: step.why, metric: step.metric, startDay: phase.startDay, endDay: null });
      }
    }
  }

  const scoreSnapshot = Object.fromEntries(PLAN_METRICS.map((m) => [m, isScore(scores[m]) ? scores[m] : null]));
  const startMs = startedAt.getTime();
  return {
    status: PLAN_STATUS.ACTIVE,
    version: 1,
    durationDays: PLAN_DURATION_DAYS,
    monthIndex,
    totalMonths: Math.max(totalMonths, monthIndex),
    startDayKey,
    startedAt,
    endsAt: new Date(startMs + PLAN_DURATION_DAYS * DAY_MS),
    createdFromSelfieId: selfieId,
    generatedBy: source,
    goals: Array.isArray(goals) ? goals.filter((g) => typeof g === 'string').slice(0, 10) : [],
    summary: usable.summary || fallbackDraft(scores).summary,
    baseline: {
      overallScore: isScore(overallScore) ? overallScore : null,
      skinAge: isScore(skinAge) ? skinAge : null,
      scores: scoreSnapshot,
      ratings: ratings ?? {},
    },
    focus: Array.isArray(focus) && focus.length ? focus : pickFocus(scores),
    // Later months do not restart from the basics: their first week carries on what already works.
    phases: PLAN_PHASES.map(({ key, name, startDay, endDay, intent }) =>
      monthIndex > 1 && key === 'foundation' ? { key, name: 'Carry on', startDay, endDay, intent: 'Keep what is working and settle into the month' } : { key, name, startDay, endDay, intent }
    ),
    steps,
    checkIns: CHECKIN_DAYS.map((day) => ({
      day,
      dueAt: new Date(startMs + (day - 1) * DAY_MS),
      status: CHECKIN_STATUS.UPCOMING,
      selfieId: null,
      completedAt: null,
      overallScore: null,
      scores: {},
    })),
    latest: {
      selfieId,
      at: startedAt,
      overallScore: isScore(overallScore) ? overallScore : null,
      scores: scoreSnapshot,
      // Empty until the first check-in; progress falls back to the baseline ratings.
      ratings: {},
    },
    adjustments: [],
  };
}
