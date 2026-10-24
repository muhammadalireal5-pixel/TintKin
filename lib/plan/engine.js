/**
 * The plan engine: turns an onboarding profile into a safe, staged routine.
 * Pure and deterministic (no AI, DB or clock), so it is unit-tested and every
 * safety rule is visible here.
 *
 * What it is built on (general dermatology guidance, not a clinical device):
 *  - Fitzpatrick phototype (1-6) for sun sensitivity and post-inflammatory
 *    pigmentation risk;
 *  - skin type (oily / dry / combination / normal / sensitive) in the spirit
 *    of the Baumann skin-type questionnaire, plus self-reported sensitivity;
 *  - ranked concerns, each mapped to evidence-backed ingredient classes
 *    (retinoids, azelaic acid, niacinamide, vitamin C, AHA/BHA, ceramides,
 *    sunscreen);
 *  - safety rules: no retinoids or high-strength acids when pregnant or
 *    unsure, no strong actives for sensitive skin, never two strong actives in
 *    one plan, one new active at a time after a barrier-first first week, and
 *    slow frequency ramps.
 */
import { CONCERNS, CONCERN_KEYS, MAX_CONCERNS } from '../constants/profile.js';

const goalToConcern = (goal) => CONCERN_KEYS.find((k) => CONCERNS[k].goal === goal);

/** Normalises whatever the user has (new questionnaire or only legacy fields). */
export function classifyProfile(user = {}) {
  const sp = user.skinProfile ?? {};
  let concerns = Array.isArray(sp.concerns) ? sp.concerns.filter((c) => CONCERN_KEYS.includes(c?.key)) : [];
  if (!concerns.length) {
    const seen = new Set();
    for (const g of Array.isArray(user.goals) ? user.goals : []) {
      const key = goalToConcern(g);
      if (key && !seen.has(key)) {
        seen.add(key);
        concerns.push({ key, rating: 3 });
      }
    }
  }
  if (!concerns.length) concerns = [{ key: 'radiance', rating: 3 }, { key: 'dryness', rating: 3 }];
  concerns = concerns
    .slice(0, MAX_CONCERNS)
    .map((c) => ({ key: c.key, rating: Math.min(5, Math.max(1, Math.round(Number(c.rating) || 3))) }));

  const skinType = ['oily', 'dry', 'combination', 'normal', 'sensitive'].includes(user.skinType) ? user.skinType : 'normal';
  const sensitivity = ['low', 'medium', 'high'].includes(sp.sensitivity) ? sp.sensitivity : skinType === 'sensitive' ? 'high' : 'medium';
  const products = new Set(sp.currentProducts ?? []);
  const pregnancy = sp.pregnancy ?? (user.sex === 'male' ? 'no' : 'prefer_not');

  return {
    concerns,
    skinType,
    sensitive: skinType === 'sensitive' || sensitivity === 'high',
    medium: sensitivity === 'medium',
    phototype: Number(sp.phototype) || 3,
    // Unsure counts as pregnant for anyone who could be, so we never guess unsafe.
    avoidUnsafe: pregnancy === 'yes' || (pregnancy === 'prefer_not' && user.sex !== 'male'),
    pregnant: pregnancy === 'yes',
    usesRetinoid: products.has('retinoid'),
    usesAcids: products.has('acids'),
    usesVitC: products.has('vitamin_c'),
    sleep: sp.sleep ?? '6to7',
    outdoor: sp.outdoor ?? 'some',
    smoker: Boolean(sp.smoker),
    stress: sp.stress ?? 'medium',
    routineTime: sp.routineTime ?? 'moderate',
  };
}

/** A realistic 30-day aim on the 1-5 self-rating scale: one level better, never past 5. */
export function ratingTarget(rating) {
  return Math.min(5, Math.round(rating) + 1);
}

/** Focus areas for a plan: the user's ranked concerns, each with a baseline and aim. */
export function buildFocus(profile) {
  return profile.concerns.map((c) => ({
    metric: c.key,
    label: CONCERNS[c.key].label,
    baseline: c.rating,
    target: ratingTarget(c.rating),
    scale: 'rating',
  }));
}

// ---- Foundation (week 1: barrier first, no actives) -------------------------

function foundation(p) {
  const cleanser = {
    oily: 'Cleanse with a gentle gel cleanser',
    dry: 'Cleanse with a creamy, non-foaming cleanser',
    sensitive: 'Cleanse with a fragrance-free, gentle cleanser',
  }[p.skinType] ?? 'Cleanse with a gentle cleanser';
  const moisturiser = {
    oily: 'Moisturise with a light, oil-free gel moisturiser',
    dry: 'Moisturise with a rich cream (look for ceramides)',
    sensitive: 'Moisturise with a fragrance-free barrier cream',
  }[p.skinType] ?? 'Moisturise';
  const mineral = p.sensitive || p.concerns.some((c) => c.key === 'redness');

  const am = [
    { text: cleanser, why: 'Removes overnight build-up without stripping your skin barrier.' },
    { text: moisturiser, why: 'A strong barrier keeps water in and irritation out, which every later step relies on.' },
    {
      text: mineral ? 'Apply a mineral broad-spectrum sunscreen, SPF 30 or higher' : 'Apply broad-spectrum sunscreen, SPF 30 or higher',
      why: p.phototype <= 2
        ? 'Your skin burns easily, so daily sunscreen is the single biggest thing you can do for it.'
        : 'Daily sunscreen protects against UV, the main driver of spots, lines and dullness.',
    },
  ];
  const pm = [
    {
      text: p.skinType === 'dry' ? 'Cleanse with a creamy cleanser (or just rinse if your skin feels tight)' : 'Cleanse your face',
      why: 'Clears sunscreen, oil and pollution from the day.',
    },
    { text: moisturiser.replace('Moisturise', 'Moisturise before bed'), why: 'Skin repairs overnight, so give it moisture to work with.' },
  ];
  if (p.routineTime !== 'quick') {
    if (p.sleep === 'under6') {
      pm.push({ text: 'Wind down: aim to be in bed 30 minutes earlier', why: 'Skin repairs while you sleep; short sleep shows up as dullness and puffiness.' });
    } else if (p.stress === 'high') {
      pm.push({ text: 'Take two slow minutes to breathe before bed', why: 'High stress can trigger breakouts and sensitivity, and calmer evenings help your skin repair.' });
    }
  }
  return { am, pm };
}

// ---- Concern -> steps -------------------------------------------------------

/** How often to use an active, from how reactive the skin is. */
const frequency = (p) => (p.medium ? 'once a week to start, then twice' : 'two evenings a week');

const SPF_REAPPLY = {
  text: 'Re-apply sunscreen if you are outside for more than two hours',
  why: 'Sunscreen wears off, and UV is what darkens spots and ages skin.',
  cls: 'spf',
};

/**
 * Ordered candidates per concern. `needs` is the safety gate; the first
 * candidate whose class is still free (see `pickStep`) is used.
 * cls 'retinoid' and 'acid' are the "strong" classes: at most one per plan.
 */
function candidates(key, p) {
  const retinoidOk = !p.avoidUnsafe && !p.sensitive && !p.usesRetinoid && p.phototype < 6;
  const acidOk = !p.sensitive && !p.avoidUnsafe && !p.usesAcids;
  const gentleAcidOk = !p.usesAcids;
  const azelaic = (why) => ({ cls: 'azelaic', text: 'Apply azelaic acid to clean skin, then moisturise', why });
  const niacinamide = (why) => ({ cls: 'niacinamide', text: 'Apply a niacinamide serum before your moisturiser', why });
  const vitC = (why) => ({
    cls: 'vitc',
    text: 'Apply a vitamin C serum before sunscreen',
    why,
    needs: !p.usesVitC && !p.sensitive,
  });
  const hydrator = (why) => ({ cls: 'hydrator', text: 'Press a hyaluronic acid serum into damp skin before moisturiser', why });
  const retinoidStep = (what, why) => ({
    cls: 'retinoid',
    text: `Apply a pea-size amount of ${what} to dry skin ${frequency(p)}, then moisturise`,
    why,
    needs: retinoidOk,
  });

  switch (key) {
    case 'acne':
      return {
        pm: [
          retinoidStep('adapalene (an over-the-counter retinoid)', 'Retinoids are first-line for breakouts: they keep pores clear and calm inflammation. Start slowly so your skin adjusts.'),
          azelaic('Azelaic acid calms breakouts and redness, and is gentle enough for sensitive or pregnant skin.'),
        ],
        am: [niacinamide('Helps balance oil and calm inflamed skin.')],
      };
    case 'spots': {
      // Irritation causes new dark marks on deeper skin tones, so go gentler there.
      const gentle = p.phototype >= 4 || p.sensitive || p.avoidUnsafe;
      return {
        pm: gentle
          ? [azelaic('Azelaic acid fades dark marks gently, with little risk of the irritation that can cause new ones.')]
          : [retinoidStep('retinol', 'Speeds up skin renewal so dark marks fade; start slowly to avoid irritation.'), azelaic('Azelaic acid fades dark marks gently.')],
        am: [
          vitC('Vitamin C is an antioxidant that helps fade dark marks and protects against new ones.'),
          niacinamide('Niacinamide helps even out tone and supports your barrier.'),
          SPF_REAPPLY,
        ],
      };
    }
    case 'wrinkles':
    case 'firmness': {
      const peptide = {
        cls: 'peptide',
        text: 'Use a peptide serum, then moisturise at night',
        why: 'Peptides support firmer, smoother-looking skin without the irritation of retinoids.',
      };
      return {
        pm: [retinoidStep('retinol', 'Retinoids are the best-studied ingredient for smoother, firmer-looking skin. Start slowly and build up.'), peptide],
        am: [
          vitC('Vitamin C protects against the free-radical damage that breaks down collagen.'),
          hydrator('Hydrated skin plumps, which softens the look of fine lines.'),
        ],
      };
    }
    case 'radiance':
      return {
        pm: [
          { cls: 'acid', text: `Use a gentle lactic or mandelic acid exfoliant ${frequency(p)}, then moisturise`, why: 'Clears dull surface cells so your skin reflects more light.', needs: acidOk },
          { cls: 'acid', text: 'Use a gentle PHA exfoliant once a week, then moisturise', why: 'PHAs exfoliate more gently than AHAs, so they suit reactive skin.', needs: gentleAcidOk },
        ],
        am: [vitC('Vitamin C brightens and evens out a tired-looking tone.'), hydrator('Hydration is the quickest route to a healthy glow.')],
      };
    case 'dryness':
      return {
        pm: [{ cls: 'barrier', text: 'Layer a ceramide cream over damp skin, with a thin occlusive on the driest areas', why: 'Ceramides rebuild the barrier and the occlusive seals water in overnight.' }],
        am: [hydrator('Hyaluronic acid pulls water into the skin, and moisturiser seals it there.')],
      };
    case 'redness':
      return {
        pm: [azelaic('Azelaic acid calms redness and irritation.'), { cls: 'habit', text: 'Wash with lukewarm water and skip scrubs', why: 'Heat and scrubbing inflame red, reactive skin.' }],
        am: [niacinamide('Niacinamide calms redness and strengthens the barrier.')],
      };
    case 'pores':
      return {
        pm: [
          { cls: 'acid', text: `Use a 2% salicylic acid (BHA) treatment ${frequency(p)}, then moisturise`, why: 'Salicylic acid goes inside pores to dissolve the oil and debris that make them look larger.', needs: acidOk },
          azelaic('Azelaic acid keeps pores clear and calm without drying skin out.'),
        ],
        am: [niacinamide('Niacinamide helps keep pores looking smaller by balancing oil.')],
      };
    default:
      return { pm: [], am: [] };
  }
}

const STRONG = new Set(['retinoid', 'acid']);

/** First usable candidate, skipping used classes, duplicates and unsafe options. */
function pickStep(list, used) {
  for (const c of list) {
    if (c.needs === false) continue;
    if (c.cls && used.cls.has(c.cls)) continue;
    if (STRONG.has(c.cls) && [...used.cls].some((u) => STRONG.has(u))) continue;
    if (used.text.has(c.text)) continue;
    used.text.add(c.text);
    if (c.cls) used.cls.add(c.cls);
    return { text: c.text, why: c.why, metric: null };
  }
  return null;
}

/**
 * The full draft in the shape `sanitizeDraft` expects: week 1 is the base
 * routine; each later phase adds at most a step or two, one new active at a
 * time, starting with the user's top concern.
 */
export function buildDraft(user) {
  const p = classifyProfile(user);
  const base = foundation(p);
  const used = { cls: new Set(), text: new Set([...base.am, ...base.pm].map((s) => s.text)) };
  const cap = p.routineTime === 'quick' ? 1 : 2;

  const per = p.concerns.map((c) => {
    const cand = candidates(c.key, p);
    const tag = (step) => step && { ...step, metric: c.key };
    return {
      pm: () => tag(pickStep(cand.pm, used)),
      am: () => tag(pickStep(cand.am, used)),
    };
  });

  const phases = { foundation: base, target: { am: [], pm: [] }, build: { am: [], pm: [] }, lockin: { am: [], pm: [] } };
  const add = (phase, slot, step) => {
    if (step && phases[phase][slot].length < cap) phases[phase][slot].push(step);
  };

  const [first, second, third] = per;
  // Week 2: one new evening step for the top concern.
  if (first) add('target', 'pm', first.pm());
  // Week 3: its morning partner, and the second concern's evening step.
  if (first) add('build', 'am', first.am());
  if (second) add('build', 'pm', second.pm());
  // Week 4: the second concern's morning step, then the third concern.
  if (second) add('lockin', 'am', second.am());
  if (third) add('lockin', 'pm', third.pm());
  if (third) add('lockin', 'am', third.am());

  if (p.phototype <= 2 || p.outdoor === 'lots') add('build', 'am', pickStep([SPF_REAPPLY], used));

  const labels = p.concerns.map((c) => CONCERNS[c.key].label.toLowerCase());
  const lead = { oily: 'oily', dry: 'dry', combination: 'combination', sensitive: 'sensitive', normal: 'balanced' }[p.skinType];
  const safety = p.pregnant
    ? ' We kept every step pregnancy-safe.'
    : p.avoidUnsafe
      ? ' We kept to gentle, pregnancy-safe ingredients because you preferred not to say.'
      : '';
  const summary = `A 30-day plan for ${lead} skin, working first on ${labels.slice(0, 2).join(' and ')}. Week 1 is just the basics to build a strong barrier, then we add one new step at a time so your skin never gets overwhelmed.${safety}`;

  return { summary, phases };
}

// ---- Safety filter for anything the AI proposes ------------------------------

const RETINOID_WORDS = /\b(retinol|retinoid|retinal|adapalene|tretinoin|isotretinoin)\b/i;
const STRONG_ACID_WORDS = /\b(salicylic|glycolic|benzoyl|bha|aha|peel)\b/i;
const NEVER_WORDS = /\b(hydroquinone|steroid|cortisone|prescription|isotretinoin|accutane)\b/i;

/**
 * Drops AI-proposed steps that break the safety rules. The AI may reword and
 * adapt, but it may not add what the engine itself would not.
 * @param {{ text: string }[]} steps
 */
export function filterSafeSteps(steps, user) {
  const p = classifyProfile(user);
  return (steps ?? []).filter((s) => {
    const text = String(s?.text ?? '');
    if (NEVER_WORDS.test(text)) return false;
    if (p.avoidUnsafe && (RETINOID_WORDS.test(text) || STRONG_ACID_WORDS.test(text))) return false;
    if (p.sensitive && (RETINOID_WORDS.test(text) || STRONG_ACID_WORDS.test(text))) return false;
    return true;
  });
}

/** One line telling the AI which safety rules apply to this person. */
export function safetyBrief(user) {
  const p = classifyProfile(user);
  const rules = [];
  if (p.avoidUnsafe) rules.push('pregnancy-safe only: no retinoids, no salicylic or glycolic acid, no benzoyl peroxide');
  if (p.sensitive) rules.push('sensitive skin: no retinoids or strong acids, gentle ingredients only');
  if (p.phototype >= 4) rules.push('deeper skin tone: avoid irritation, which can cause new dark marks');
  return rules.length ? `Safety rules (must follow): ${rules.join('; ')}.` : 'Safety: introduce one new active at a time and never combine a retinoid and an acid on the same night.';
}
