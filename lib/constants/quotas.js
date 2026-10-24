export const DENIAL_REASONS = Object.freeze({
  DAILY_LIMIT: 'daily_limit',
  MONTHLY_LIMIT: 'monthly_limit',
});

export const TIER_QUOTAS = Object.freeze({
  free: {
    monthlyScans: 2,
    monthlySimulations: 1,
  },
  standard: {
    monthlyScans: 6,
    monthlySimulations: 3,
  },
  premium: {
    monthlyScans: 12,
    monthlySimulations: 4,
  },
});

// Skin barely changes within a day, but lighting and angle do: more than a few
// scans a day just produces noisy trends and burns the month's allowance.
export const SCAN_DAILY_LIMIT = 5;

/**
 * Resolves the scan caps for a tier. This is the single source of truth for
 * scan limits — both the read-only usage display and the atomic quota
 * reservation must agree on these numbers, or the display will lie.
 * @param {string} tier
 * @returns {{ dailyLimit: number, monthlyLimit: number }}
 */
export function getTierScanLimits(tier) {
  const quotas = TIER_QUOTAS[tier] || TIER_QUOTAS.free;
  return {
    dailyLimit: SCAN_DAILY_LIMIT,
    monthlyLimit: quotas.monthlyScans,
  };
}

/**
 * Resolves the monthly simulation cap for a tier.
 * @param {string} tier
 * @returns {number}
 */
export function getTierSimLimit(tier) {
  const quotas = TIER_QUOTAS[tier] || TIER_QUOTAS.free;
  return quotas.monthlySimulations;
}
