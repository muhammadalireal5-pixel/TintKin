import { CONCERNS } from '../constants/profile.js';
import { DEFAULT_RECOMMENDED_PRODUCTS, PRODUCT_TYPES } from '../constants/products.js';
import { classifyProfile, filterNotDenied, filterSafeSteps, safetyBrief, toPlainUser } from './engine.js';

const PRODUCT_COUNT = 3;

const SAFE_FALLBACKS = Object.freeze({
  Cleanser: { type: 'Cleanser', formula: 'Gentle fragrance-free cleanser', description: 'Cleanses without stripping your skin barrier.' },
  Moisturizer: { type: 'Moisturizer', formula: 'Ceramide barrier cream', description: 'Keeps moisture in and supports your skin barrier.' },
  Sunscreen: { type: 'Sunscreen', formula: 'Mineral broad-spectrum sunscreen', description: 'Daily protection that is gentle on reactive skin.' },
  Serum: { type: 'Serum', formula: 'Niacinamide or hyaluronic acid serum', description: 'Hydrates and calms without strong actives.' },
});
const FALLBACK_ORDER = ['Cleanser', 'Moisturizer', 'Sunscreen', 'Serum'];

const productText = (p) => `${p.type}: ${p.formula} ${p.description || ''}`;

export function sanitizeRecommendedProducts(products) {
  if (!Array.isArray(products)) return DEFAULT_RECOMMENDED_PRODUCTS;
  const valid = products.filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      PRODUCT_TYPES.includes(p.type) &&
      typeof p.formula === 'string' &&
      p.formula.trim().length > 0 &&
      typeof p.description === 'string' &&
      p.description.trim().length > 0
  );
  return valid.length === PRODUCT_COUNT ? valid : DEFAULT_RECOMMENDED_PRODUCTS;
}

export function describeSkinProfile(user) {
  const p = classifyProfile(toPlainUser(user));
  const concerns = p.concerns.map((c) => `${CONCERNS[c.key].label} (self-rated ${c.rating}/5)`).join(', ');
  const traits = [
    `skin type ${p.skinType}`,
    p.sensitive ? 'sensitive skin' : p.medium ? 'moderately reactive skin' : 'not reactive',
    `Fitzpatrick phototype ${p.phototype}`,
    `outdoor time ${p.outdoor}`,
  ];
  return `Skin profile: ${traits.join(', ')}. Main concerns, in priority order: ${concerns}. ${safetyBrief(toPlainUser(user))}`;
}

const asText = (item) => (typeof item === 'string' ? item : String(item?.text ?? ''));

function keepSafe(list, user, filter) {
  if (!Array.isArray(list)) return [];
  const steps = list.map((item) => ({ item, text: asText(item) })).filter((s) => s.text);
  const allowed = new Set(filter(steps, user));
  return steps.filter((s) => allowed.has(s)).map((s) => s.item);
}

export function makeProductsSafe(products, user) {
  const plain = toPlainUser(user);
  const safe = keepSafe(
    (Array.isArray(products) ? products : []).map((p) => ({ ...p, text: productText(p) })),
    plain,
    filterSafeSteps
  ).map(({ text, ...rest }) => rest);
  const out = safe.slice(0, PRODUCT_COUNT);
  const have = new Set(out.map((p) => p.type));
  for (const type of FALLBACK_ORDER) {
    if (out.length >= PRODUCT_COUNT) break;
    if (have.has(type)) continue;
    out.push({ ...SAFE_FALLBACKS[type] });
    have.add(type);
  }
  return out;
}

function safeSentences(text, user) {
  if (typeof text !== 'string' || !text.trim()) return '';
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => ({ text: s }));
  return filterNotDenied(sentences, user).map((s) => s.text).join(' ');
}

export function makeAdviceSafe(advice, user) {
  const plain = toPlainUser(user);
  const critique = safeSentences(advice.critique, plain);
  return {
    ...advice,
    critique: critique || 'Your scan is saved. Follow your plan steps and check in again to see how your skin is changing.',
    amRoutine: keepSafe(advice.amRoutine, plain, filterSafeSteps),
    pmRoutine: keepSafe(advice.pmRoutine, plain, filterSafeSteps),
    habits: keepSafe(advice.habits, plain, filterNotDenied),
    facialWorkout: safeSentences(advice.facialWorkout, plain),
    products: makeProductsSafe(advice.products, plain),
  };
}
