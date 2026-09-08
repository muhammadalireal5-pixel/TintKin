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
