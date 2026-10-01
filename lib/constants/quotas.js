export const DENIAL_REASONS = Object.freeze({
  DAILY_LIMIT: 'daily_limit',
  MONTHLY_LIMIT: 'monthly_limit',
  EVERY_OTHER_DAY: 'every_other_day',
});

export const TIER_QUOTAS = Object.freeze({
  free: {
    monthlyScans: 2,
    monthlySimulations: 1,
  },
  standard: {
    monthlyScans: 15,
    monthlySimulations: 3,
  },
  premium: {
    monthlyScans: null, // full days of month
    monthlySimulations: 4,
  },
});

const SCAN_DAILY_LIMIT = 1;

/**
 * Resolves the scan caps for a tier. This is the single source of truth for
 * scan limits — both the read-only usage display and the atomic quota
 * reservation must agree on these numbers, or the display will lie.
 * @param {string} tier
 * @param {number} daysInMonth
 * @returns {{ dailyLimit: number, monthlyLimit: number }}
 */
export function getTierScanLimits(tier, daysInMonth) {
  const quotas = TIER_QUOTAS[tier] || TIER_QUOTAS.free;
  return {
    dailyLimit: SCAN_DAILY_LIMIT,
    monthlyLimit: quotas.monthlyScans ?? daysInMonth,
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
