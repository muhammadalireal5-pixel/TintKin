import {
  SKIN_TYPES,
  SEX_OPTIONS,
  CONCERNS,
  CONCERN_KEYS,
  MAX_CONCERNS,
  SENSITIVITY_OPTIONS,
  SUN_REACTIONS,
  CURRENT_PRODUCTS,
  SLEEP_OPTIONS,
  OUTDOOR_OPTIONS,
  STRESS_OPTIONS,
  PREGNANCY_OPTIONS,
  ROUTINE_TIME_OPTIONS,
} from '../constants/profile.js';
import { calculateAge } from '../utils/date.js';
import { normalizeMonths } from '../constants/plan.js';

/**
 * Validates onboarding payload for both client and server actions.
 * @param {Record<string, any>} data
 * @returns {{ isValid: boolean, error?: string, sanitized?: any }}
 */
export function validateOnboarding(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid submission data.' };
  }

  const { birthDate, sex, skinType, goals, customGoal, concerns } = data;

  if (!birthDate) {
    return { isValid: false, error: 'Date of birth is required.' };
  }

  const parsedDate = new Date(birthDate);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid birth date provided.' };
  }

  // Terms of Service (app/terms/page.jsx §4) requires users to be 18+; this
  // previously only enforced 13+ (and with a naive year-subtraction that
  // could be off by one), letting minors the Terms explicitly exclude create
  // an account and upload facial biometric data.
  const age = calculateAge(parsedDate);

  if (age == null || age < 18 || age > 120) {
    return { isValid: false, error: 'You must be at least 18 years old to use TintKin.' };
  }

  if (!sex) {
    return { isValid: false, error: 'Please select your gender.' };
  }

  const normalizedSex = typeof sex === 'string' && SEX_OPTIONS.includes(sex.toLowerCase())
    ? sex.toLowerCase()
    : 'prefer_not_to_say';

  if (!skinType) {
    return { isValid: false, error: 'Please select your skin type.' };
  }

  const normalizedSkinType = typeof skinType === 'string' && SKIN_TYPES.includes(skinType.toLowerCase())
    ? skinType.toLowerCase()
    : 'combination';

  // New flow: ranked concerns with a 1-5 self-rating each. Older clients still
  // send plain goal labels, which stay valid.
  const cleanConcerns = [];
  if (Array.isArray(concerns)) {
    for (const c of concerns) {
      const key = c?.key;
      const rating = Number(c?.rating);
      if (!CONCERN_KEYS.includes(key) || cleanConcerns.some((x) => x.key === key)) continue;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
      cleanConcerns.push({ key, rating });
    }
  }
  if (cleanConcerns.length > MAX_CONCERNS) cleanConcerns.length = MAX_CONCERNS;

  let validGoals;
  if (cleanConcerns.length > 0) {
    validGoals = [...new Set(cleanConcerns.map((c) => CONCERNS[c.key].goal))];
  } else {
    if (!Array.isArray(goals) || goals.length === 0) {
      return { isValid: false, error: 'Please pick at least one skin concern.' };
    }
    validGoals = goals
      .filter((g) => typeof g === 'string')
      .map((g) => g.slice(0, 50))
      .slice(0, 10);
  }

  const pick = (value, options, fallback = null) => (options.some((o) => String(o.value) === String(value)) ? value : fallback);
  const skinProfile = {
    concerns: cleanConcerns,
    sensitivity: pick(data.sensitivity, SENSITIVITY_OPTIONS, 'medium'),
    phototype: Number(pick(data.phototype, SUN_REACTIONS, 3)),
    currentProducts: Array.isArray(data.currentProducts)
      ? [...new Set(data.currentProducts.filter((p) => CURRENT_PRODUCTS.some((o) => o.value === p)))]
      : [],
    sleep: pick(data.sleep, SLEEP_OPTIONS, '6to7'),
    outdoor: pick(data.outdoor, OUTDOOR_OPTIONS, 'some'),
    smoker: data.smoker === true,
    stress: pick(data.stress, STRESS_OPTIONS, 'medium'),
    // Unanswered or "prefer not to say" is treated conservatively by the plan.
    pregnancy: pick(data.pregnancy, PREGNANCY_OPTIONS, 'prefer_not'),
    routineTime: pick(data.routineTime, ROUTINE_TIME_OPTIONS, 'moderate'),
    // How many months the person wants to work on their skin. Left out (undefined)
    // when not sent, so saving an old form never wipes an earlier choice.
    planMonths: normalizeMonths(data.planMonths) ?? undefined,
  };

  const cleanCustomGoal = typeof customGoal === 'string'
    ? customGoal.replace(/[{}\[\]`"'<>\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    : '';

  return {
    isValid: true,
    sanitized: {
      birthDate: parsedDate,
      sex: normalizedSex,
      skinType: normalizedSkinType,
      goals: validGoals,
      customGoal: cleanCustomGoal,
      skinProfile: cleanConcerns.length > 0 ? skinProfile : null,
    },
  };
}
