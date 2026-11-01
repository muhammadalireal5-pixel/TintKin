import { INGREDIENT_CLASSES, CLASS_CONCERNS, classesIn } from './knowledge.js';
import { classifyProfile, filterNotDenied } from './engine.js';
import { CONCERNS } from '../constants/profile.js';

export const PRODUCT_CHECK_DISCLAIMER = 'This is an ingredient match with your plan, not a recommendation or a safety assessment. Patch test new products.';

const MAX_INGREDIENTS = 80;
const MAX_TEXT = 4000;

const FRAGRANCE = /\b(parfum|fragrance|aroma|linalool|limonene|citral|geraniol|eugenol|citronellol|coumarin|benzyl salicylate|hexyl cinnamal)\b/i;
const ESSENTIAL_OIL = /\b(lavandula|lavender|citrus|bergamot|mentha|peppermint|eucalyptus|rosmarinus|rosemary|melaleuca|tea tree|ylang|cinnamomum|clove)\b.*\b(oil|extract)\b/i;
const DRYING_ALCOHOL = /\b(alcohol denat|sd alcohol|denatured alcohol|isopropyl alcohol)\b/i;
const NEVER = /\b(hydroquinone|mercury|clobetasol|betamethasone|hydrocortisone|kojic)\b/i;
const ONE_PERCENT_LINE = /\b(phenoxyethanol|parfum|fragrance|ethylhexylglycerin|potassium sorbate|sodium benzoate|xanthan gum|disodium edta)\b/i;

export function parseIngredients(text) {
  const clean = String(text ?? '')
    .slice(0, MAX_TEXT)
    .replace(/^\s*(ingredients|ingrédients|inci)\s*[:：]/i, '')
    .replace(/\([^)]*\)/g, (m) => m.replace(/,/g, ' '))
    .replace(/[*•·]/g, ',');
  const seen = new Set();
  const out = [];
  for (const raw of clean.split(/[,;\n]+/)) {
    const name = raw.replace(/\s+/g, ' ').trim().replace(/\.$/, '').trim();
    if (name.length < 2 || name.length > 80) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_INGREDIENTS) break;
  }
  return out;
}

export function checkProduct(ingredients, user, planSteps = []) {
  const p = classifyProfile(user);
  const oneLine = ingredients.findIndex((i) => ONE_PERCENT_LINE.test(i));
  const found = new Map();
  ingredients.forEach((name, index) => {
    for (const cls of classesIn(name)) {
      if (cls === 'habit') continue;
      const entry = found.get(cls) ?? { cls, label: INGREDIENT_CLASSES[cls].label, names: [], trace: true };
      entry.names.push(name);
      if (oneLine === -1 || index < oneLine) entry.trace = false;
      found.set(cls, entry);
    }
  });
  const classes = [...found.values()];
  const meaningful = classes.filter((c) => !c.trace);

  const flags = [];
  const avoid = (msg) => flags.push({ level: 'avoid', msg });
  const caution = (msg) => flags.push({ level: 'caution', msg });

  const never = ingredients.filter((i) => NEVER.test(i));
  if (never.length) avoid(`Contains ${never.join(', ')}, which needs a doctor's guidance and is never part of a TintKin plan.`);
  for (const c of meaningful) {
    if (!INGREDIENT_CLASSES[c.cls].strong) continue;
    const denied = filterNotDenied([{ text: c.names.join(' ') }], user).length === 0;
    if (denied && p.avoidUnsafe) avoid(`${c.label} (${c.names[0]}) is one we leave out while you are pregnant, trying, or unsure.`);
    else if (denied && p.sensitive) avoid(`${c.label} (${c.names[0]}) is usually too strong for sensitive skin like yours.`);
  }
  if (p.sensitive) {
    const fragrance = ingredients.filter((i) => FRAGRANCE.test(i));
    if (fragrance.length) caution(`Fragrance (${fragrance.slice(0, 2).join(', ')}) is a common trigger for sensitive skin.`);
    const oils = ingredients.filter((i) => ESSENTIAL_OIL.test(i));
    if (oils.length) caution(`Essential oils (${oils[0]}) can irritate reactive skin.`);
  }
  if ((p.sensitive || p.skinType === 'dry') && ingredients.slice(0, 6).some((i) => DRYING_ALCOHOL.test(i))) {
    caution('Drying alcohol is high on the list, which can leave dry or sensitive skin tight.');
  }

  const live = planSteps.filter((s) => s.endDay == null);
  const conflicts = [];
  for (const c of meaningful) {
    const same = live.find((s) => s.cls === c.cls);
    if (same) {
      conflicts.push(`Your plan already has a ${c.label.toLowerCase()} step ("${same.text}"). Use one or the other, not both.`);
      continue;
    }
    if (INGREDIENT_CLASSES[c.cls].strong) {
      const other = live.find((s) => INGREDIENT_CLASSES[s.cls]?.strong);
      if (other) conflicts.push(`Your plan already runs a ${INGREDIENT_CLASSES[other.cls].label.toLowerCase()}. Two strong actives at once raise the risk of irritation, so don't use them on the same night.`);
    }
  }

  const concernKeys = p.concerns.map((c) => c.key);
  const fit = concernKeys
    .filter((k) => meaningful.some((c) => (CLASS_CONCERNS[c.cls] ?? []).includes(k)))
    .map((k) => ({ key: k, label: CONCERNS[k]?.label ?? k, by: meaningful.filter((c) => (CLASS_CONCERNS[c.cls] ?? []).includes(k)).map((c) => c.label) }));

  const strongest = meaningful.find((c) => INGREDIENT_CLASSES[c.cls].strong) ?? meaningful.find((c) => INGREDIENT_CLASSES[c.cls].slot) ?? null;
  const slot = meaningful.some((c) => c.cls === 'spf')
    ? 'am'
    : strongest
      ? INGREDIENT_CLASSES[strongest.cls].slot
      : null;
  const placement = slot === 'am'
    ? 'Morning, after cleansing and before sunscreen.'
    : slot === 'pm'
      ? strongest && INGREDIENT_CLASSES[strongest.cls].strong
        ? 'Evening, on the nights your plan has no other active. Start once a week.'
        : 'Evening, after cleansing and before moisturiser.'
      : 'Either routine, as your cleanser or moisturiser.';

  const verdict = flags.some((f) => f.level === 'avoid')
    ? 'avoid'
    : flags.length || conflicts.length
      ? 'caution'
      : fit.length
        ? 'good'
        : 'neutral';

  return {
    ingredientCount: ingredients.length,
    classes: classes.map(({ cls, label, names, trace }) => ({ cls, label, names: names.slice(0, 3), trace })),
    fit,
    flags,
    conflicts,
    slot,
    placement,
    verdict,
    disclaimer: PRODUCT_CHECK_DISCLAIMER,
  };
}
