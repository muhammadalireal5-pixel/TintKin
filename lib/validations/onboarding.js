import { SKIN_TYPES, SEX_OPTIONS } from '../constants/profile.js';

/**
 * Validates onboarding payload for both client and server actions.
 * @param {Record<string, any>} data
 * @returns {{ isValid: boolean, error?: string, sanitized?: any }}
 */
export function validateOnboarding(data) {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid submission data.' };
  }

  const { birthDate, sex, skinType, goals, customGoal } = data;

  if (!birthDate) {
    return { isValid: false, error: 'Date of birth is required.' };
  }

  const parsedDate = new Date(birthDate);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: 'Invalid birth date provided.' };
  }

  const currentYear = new Date().getFullYear();
  const birthYear = parsedDate.getFullYear();
  const age = currentYear - birthYear;

  if (age < 13 || age > 120) {
    return { isValid: false, error: 'Age must be between 13 and 120.' };
  }

  if (!sex) {
    return { isValid: false, error: 'Please select your sex.' };
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

  if (!Array.isArray(goals) || goals.length === 0) {
    return { isValid: false, error: 'Please select at least one skin goal.' };
  }

  const validGoals = goals
    .filter((g) => typeof g === 'string')
    .map((g) => g.slice(0, 50))
    .slice(0, 10);

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
    },
  };
}
