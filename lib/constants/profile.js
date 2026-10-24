export const SKIN_TYPES = Object.freeze([
  'oily',
  'dry',
  'combination',
  'normal',
  'sensitive',
]);

export const SEX_OPTIONS = Object.freeze([
  'female',
  'male',
  'other',
  'prefer_not_to_say',
]);

export const GOAL_OPTIONS = Object.freeze([
  'Reduce Acne/Pimples',
  'Anti-aging/Firmness',
  'Improve Radiance/Glow',
  'Reduce Spots/Pigmentation',
  'Other',
]);

/**
 * Skin concerns the plan can work on. `goal` is the legacy goal label stored in
 * `user.goals` (the rest of the app reads that); `scanMetric` is the YouCam
 * score that measures the concern, when there is one (an optional scan adds a
 * measured number next to the self-rating).
 */
export const CONCERNS = Object.freeze({
  acne: { label: 'Breakouts', goal: 'Reduce Acne/Pimples', scanMetric: null, blurb: 'Pimples and clogged pores' },
  spots: { label: 'Dark spots', goal: 'Reduce Spots/Pigmentation', scanMetric: 'spots', blurb: 'Uneven tone, marks, sun spots' },
  wrinkles: { label: 'Fine lines', goal: 'Anti-aging/Firmness', scanMetric: 'wrinkles', blurb: 'Lines and early wrinkles' },
  firmness: { label: 'Firmness', goal: 'Anti-aging/Firmness', scanMetric: 'firmness', blurb: 'Bounce and elasticity' },
  radiance: { label: 'Dullness', goal: 'Improve Radiance/Glow', scanMetric: 'radiance', blurb: 'Tired, flat-looking skin' },
  dryness: { label: 'Dryness', goal: 'Improve Radiance/Glow', scanMetric: null, blurb: 'Tightness, flaking, rough texture' },
  redness: { label: 'Redness', goal: 'Improve Radiance/Glow', scanMetric: null, blurb: 'Flushing and irritation' },
  pores: { label: 'Visible pores', goal: 'Reduce Acne/Pimples', scanMetric: null, blurb: 'Large or congested pores' },
});

export const CONCERN_KEYS = Object.freeze(Object.keys(CONCERNS));

/** How many concerns a plan works on at most; the first one picked is the top priority. */
export const MAX_CONCERNS = 3;

/** Self-rating of a concern, 1 (struggling) to 5 (great). */
export const RATING_LABELS = Object.freeze(['', 'Struggling', 'Not great', 'Okay', 'Good', 'Great']);

export const SENSITIVITY_OPTIONS = Object.freeze([
  { value: 'low', label: 'Rarely', hint: 'Products almost never bother my skin' },
  { value: 'medium', label: 'Sometimes', hint: 'Some products sting or redden my skin' },
  { value: 'high', label: 'Often', hint: 'My skin reacts easily or flushes a lot' },
]);

/** Simplified Fitzpatrick questionnaire: the value is the phototype (1-6). */
export const SUN_REACTIONS = Object.freeze([
  { value: 1, label: 'Always burns, never tans' },
  { value: 2, label: 'Burns easily, tans a little' },
  { value: 3, label: 'Sometimes burns, tans slowly' },
  { value: 4, label: 'Rarely burns, tans easily' },
  { value: 5, label: 'Very rarely burns, tans deeply' },
  { value: 6, label: 'Never burns' },
]);

export const CURRENT_PRODUCTS = Object.freeze([
  { value: 'cleanser', label: 'Cleanser' },
  { value: 'moisturizer', label: 'Moisturiser' },
  { value: 'sunscreen', label: 'Sunscreen' },
  { value: 'vitamin_c', label: 'Vitamin C' },
  { value: 'retinoid', label: 'Retinol / retinoid' },
  { value: 'acids', label: 'Exfoliating acids' },
]);

export const SLEEP_OPTIONS = Object.freeze([
  { value: 'under6', label: 'Under 6 hours' },
  { value: '6to7', label: '6 to 7 hours' },
  { value: '7plus', label: '7+ hours' },
]);

export const OUTDOOR_OPTIONS = Object.freeze([
  { value: 'indoors', label: 'Mostly indoors' },
  { value: 'some', label: 'Some time outside' },
  { value: 'lots', label: 'A lot outside' },
]);

export const STRESS_OPTIONS = Object.freeze([
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]);

export const PREGNANCY_OPTIONS = Object.freeze([
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes (pregnant, breastfeeding or trying)' },
  { value: 'prefer_not', label: 'Prefer not to say' },
]);

export const ROUTINE_TIME_OPTIONS = Object.freeze([
  { value: 'quick', label: 'Quick', hint: '2 to 3 minutes, few steps' },
  { value: 'moderate', label: 'Balanced', hint: 'About 5 minutes' },
  { value: 'full', label: 'Full', hint: 'I enjoy a proper routine' },
]);
