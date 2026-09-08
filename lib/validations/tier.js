import { ALLOWED_USER_TIERS, ALLOWED_ADMIN_TIERS } from '../constants/tiers.js';

/**
 * Validates a tier requested by a user.
 * @param {any} tier
 * @returns {boolean}
 */
export function isValidUserTier(tier) {
  return typeof tier === 'string' && ALLOWED_USER_TIERS.includes(/** @type {any} */ (tier));
}

/**
 * Validates a tier assignable by an admin or webhook.
 * @param {any} tier
 * @returns {boolean}
 */
export function isValidAdminTier(tier) {
  return typeof tier === 'string' && ALLOWED_ADMIN_TIERS.includes(/** @type {any} */ (tier));
}
