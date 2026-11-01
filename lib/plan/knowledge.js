export const KNOWLEDGE_VERSION = '2026-10-27.1';

export const INGREDIENT_CLASSES = {
  retinoid: { label: 'Retinoid', strong: true, exfoliant: true, slot: 'pm', ladder: 'retinoid' },
  acid: { label: 'Exfoliating acid', strong: true, exfoliant: true, slot: 'pm', ladder: 'acid' },
  azelaic: { label: 'Azelaic acid', strong: false, exfoliant: false, slot: 'pm', ladder: 'azelaic' },
  vitc: { label: 'Vitamin C', strong: false, exfoliant: false, slot: 'am', ladder: 'vitc' },
  niacinamide: { label: 'Niacinamide', strong: false, exfoliant: false, slot: 'am', ladder: null },
  hydrator: { label: 'Hydrator', strong: false, exfoliant: false, slot: 'am', ladder: null },
  peptide: { label: 'Peptide', strong: false, exfoliant: false, slot: 'pm', ladder: null },
  barrier: { label: 'Barrier repair', strong: false, exfoliant: false, slot: 'pm', ladder: null },
  spf: { label: 'Sunscreen', strong: false, exfoliant: false, slot: 'am', ladder: null },
  habit: { label: 'Habit', strong: false, exfoliant: false, slot: null, ladder: null },
};

export const CLASS_CONCERNS = {
  retinoid: ['wrinkles', 'firmness', 'acne', 'spots', 'pores'],
  acid: ['radiance', 'pores', 'acne', 'spots'],
  azelaic: ['acne', 'spots', 'redness', 'pores'],
  vitc: ['spots', 'radiance', 'wrinkles'],
  niacinamide: ['pores', 'redness', 'acne', 'spots', 'dryness'],
  hydrator: ['dryness', 'wrinkles', 'radiance'],
  peptide: ['wrinkles', 'firmness'],
  barrier: ['dryness', 'redness'],
  spf: ['spots', 'wrinkles', 'redness'],
};

export const CLASS_WORDS = [
  ['retinoid', /\b(retin[\w-]*|differin|tazarotene|tazorac|trifarotene|aklief|adapalene|tretinoin|vitamin a)\b/i],
  ['acid', /\b(salicylic|glycolic|lactic|mandelic|bha|aha|pha|gluconolactone|lactobionic|exfoliant)\b/i],
  ['azelaic', /\bazelaic\b/i],
  ['vitc', /\b(vitamin c|ascorbic|ascorbyl|ethyl ascorbic)\b/i],
  ['niacinamide', /\bniacinamide\b/i],
  ['hydrator', /\b(hyaluronic|hyaluronate|glycerin|panthenol)\b/i],
  ['peptide', /\bpeptide/i],
  ['barrier', /\b(ceramide|squalane|cholesterol)/i],
  ['spf', /\b(sunscreen|spf|zinc oxide|titanium dioxide)\b/i],
];

export function classOf(text) {
  const t = String(text ?? '');
  for (const [cls, re] of CLASS_WORDS) if (re.test(t)) return cls;
  return null;
}

export function classesIn(text) {
  const t = String(text ?? '');
  return CLASS_WORDS.filter(([, re]) => re.test(t)).map(([cls]) => cls);
}

export const LADDERS = {
  retinoid: { rungs: [1, 2, 3, 4], minDays: 14 },
  acid: { rungs: [1, 2, 3], minDays: 14 },
  azelaic: { rungs: [3, 5, 7], minDays: 14 },
  vitc: { rungs: [4, 7], minDays: 14 },
};

export const WEEK_PATTERNS = {
  1: [3],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 2, 4, 6],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export const CONFLICTS = [
  ['retinoid', 'acid'],
  ['retinoid', 'vitc'],
  ['acid', 'vitc'],
];

export function conflicts(a, b) {
  return CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export const COACH_RULES = {
  pauseDaysAfterReaction: 3,
  stepUpMinAdherence: 0.7,
  newRungAmberDays: 7,
  tingleHoldDays: 7,
  repeatReactionWindowDays: 14,
};

export const REACTION_LEVELS = ['fine', 'tingle', 'irritated', 'breakout'];
export const SERIOUS_REACTIONS = new Set(['irritated', 'breakout']);

export function stepTemplate(step) {
  const t = String(step?.text ?? '').toLowerCase();
  const cls = step?.cls ?? classOf(t);
  if (/cleans|rinse|wash/.test(t)) return { kind: 'cleanse', seconds: 60, tip: 'Massage gently for a full minute, then rinse with lukewarm water.' };
  if (cls === 'spf') return { kind: 'protect', seconds: 30, tip: 'Use two finger-lengths for face and neck. Most people apply half of what the label assumes.' };
  if (cls === 'habit' || /breathe|bed|wind down/.test(t)) return { kind: 'habit', seconds: 120, tip: 'Breathe in for four, out for six.' };
  if (/moistur|cream|occlusive/.test(t)) return { kind: 'moisturise', seconds: 30, tip: 'Press it in with flat palms rather than rubbing.' };
  if (cls === 'retinoid') return { kind: 'treat', seconds: 30, tip: 'A pea-size amount for the whole face. Keep it away from the corners of your eyes and mouth.' };
  return { kind: 'treat', seconds: 30, tip: 'A few drops is enough. Let it settle before the next step.' };
}
