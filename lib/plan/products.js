import { getStepsForDay } from './state.js';

const CLASS_RULES = [
  ['retinoid', /\b(retin[\w-]*|differin|tazarotene|adapalene|tretinoin|vitamin a)\b/i],
  ['acid', /\b(salicylic|glycolic|lactic|mandelic|bha|aha|pha|exfoliant|exfoliate|peel)\b/i],
  ['azelaic', /\bazelaic\b/i],
  ['vitc', /\bvitamin c\b/i],
  ['niacinamide', /\bniacinamide\b/i],
  ['peptide', /\bpeptide/i],
  ['hydrator', /\bhyaluronic\b/i],
  ['serum', /\b(serum|brightening|treatment)\b/i],
  ['sunscreen', /\b(sunscreen|spf|sunblock|sun protection)\b/i],
  ['cleanser', /\b(cleanse|cleanser)\b/i],
  ['moisturiser', /\b(moistur\w*|ceramide\w*|barrier cream|rich cream)\b/i],
];

const ACTIVE_CLASSES = new Set(['retinoid', 'acid', 'azelaic', 'vitc', 'niacinamide', 'peptide', 'hydrator', 'serum']);

export function classifyStep(text) {
  const t = String(text || '');
  const hit = CLASS_RULES.find(([, re]) => re.test(t));
  return hit ? hit[0] : null;
}

const pick = (text, rules, fallback) => {
  const hit = rules.find(([re]) => re.test(text));
  return hit ? hit[1] : fallback;
};

function describeProduct(cls, text) {
  switch (cls) {
    case 'retinoid':
      return { type: 'Serum', formula: pick(text, [[/adapalene|differin/i, 'Adapalene (over-the-counter retinoid)']], 'Retinol') };
    case 'acid':
      return {
        type: 'Exfoliant',
        formula: pick(text, [
          [/salicylic|bha/i, 'Salicylic acid (BHA)'],
          [/lactic|mandelic/i, 'Lactic or mandelic acid'],
          [/\bpha\b/i, 'PHA exfoliant'],
          [/glycolic/i, 'Glycolic acid'],
        ], 'Gentle exfoliating acid'),
      };
    case 'azelaic':
      return { type: 'Serum', formula: 'Azelaic acid' };
    case 'vitc':
      return { type: 'Serum', formula: 'Vitamin C serum' };
    case 'niacinamide':
      return { type: 'Serum', formula: 'Niacinamide serum' };
    case 'peptide':
      return { type: 'Serum', formula: 'Peptide serum' };
    case 'hydrator':
      return { type: 'Serum', formula: 'Hyaluronic acid serum' };
    case 'serum':
      return { type: 'Serum', formula: 'Targeted serum' };
    case 'sunscreen':
      return { type: 'Sunscreen', formula: /mineral/i.test(text) ? 'Mineral broad-spectrum sunscreen' : 'Broad-spectrum sunscreen' };
    case 'cleanser':
      return {
        type: 'Cleanser',
        formula: pick(text, [
          [/gel/i, 'Gentle gel cleanser'],
          [/creamy|non-foaming/i, 'Creamy, non-foaming cleanser'],
          [/fragrance-free/i, 'Fragrance-free gentle cleanser'],
        ], 'Gentle cleanser'),
      };
    default:
      return {
        type: 'Moisturizer',
        formula: pick(text, [
          [/oil-free|gel moisturi/i, 'Light, oil-free gel moisturiser'],
          [/ceramide/i, 'Ceramide cream'],
          [/fragrance-free/i, 'Fragrance-free barrier cream'],
        ], 'Moisturiser'),
      };
  }
}

const firstSentence = (text) => String(text || '').trim().split(/(?<=[.!?])\s/)[0];

const PRODUCT_COUNT = 3;
const MAX_ACTIVES = 2;

/**
 * Products that go with the steps the person is doing today. Derived from the
 * plan itself, so a profile edit, a Kin change or a dropped step changes the
 * products with it; nothing is stored and nothing can go stale.
 * @param {any} plan
 * @param {number} day plan day
 * @returns {{ type: string, formula: string, description: string }[]}
 */
export function deriveProductsFromPlan(plan, day) {
  if (!plan?.steps?.length) return [];
  const today = getStepsForDay(plan, day);
  const steps = [...today.am, ...today.pm];
  const focusOrder = new Map((plan.focus ?? []).map((f, i) => [f.metric, i]));
  const rank = (s) => (focusOrder.has(s.metric) ? focusOrder.get(s.metric) : 99);

  const byClass = new Map();
  for (const step of [...steps].sort((a, b) => rank(a) - rank(b))) {
    const cls = classifyStep(step.text);
    if (cls && !byClass.has(cls)) byClass.set(cls, step);
  }

  const order = [
    ...[...byClass.keys()].filter((c) => ACTIVE_CLASSES.has(c)).slice(0, MAX_ACTIVES),
    ...['sunscreen', 'moisturiser', 'cleanser'].filter((c) => byClass.has(c)),
  ];

  return order.slice(0, PRODUCT_COUNT).map((cls) => {
    const step = byClass.get(cls);
    const { type, formula } = describeProduct(cls, step.text);
    return { type, formula, description: firstSentence(step.why) || `Supports your step: ${step.text}` };
  });
}
