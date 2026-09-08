import { SKIN_TYPES } from '../constants/profile.js';
import { STANDARD_PACING } from '../constants/tiers.js';
import { ALLOWED_PHOTO_PRIVACY } from '../constants/privacy.js';

/**
 * Validates settings update payload.
 * @param {Record<string, any>} settings
 * @returns {{ isValid: boolean, error?: string, sanitized: Record<string, any> }}
 */
export function validateUserSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { isValid: false, error: 'Invalid settings object', sanitized: {} };
  }

  const updates = {};

  if (typeof settings.skinType === 'string') {
    const lower = settings.skinType.toLowerCase();
    if (SKIN_TYPES.includes(lower)) {
      updates.skinType = lower;
    }
  }

  if (typeof settings.displayName === 'string' && settings.displayName.trim()) {
    updates.displayName = settings.displayName.trim().slice(0, 50);
  }

  if (typeof settings.optInComparison === 'boolean') {
    updates.optInComparison = settings.optInComparison;
  }

  if (typeof settings.standardPlanFrequency === 'string') {
    if (Object.values(STANDARD_PACING).includes(/** @type {any} */ (settings.standardPlanFrequency))) {
      updates.standardPlanFrequency = settings.standardPlanFrequency;
    }
  }

  if (typeof settings.photoPrivacy === 'string') {
    if (ALLOWED_PHOTO_PRIVACY.includes(/** @type {any} */ (settings.photoPrivacy))) {
      updates.photoPrivacy = settings.photoPrivacy;
    }
  }

  if (typeof settings.locationPromptDismissed === 'boolean') {
    updates.locationPromptDismissed = settings.locationPromptDismissed;
  }

  return { isValid: true, sanitized: updates };
}
