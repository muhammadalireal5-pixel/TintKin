export const TIERS = Object.freeze({
  FREE: 'free',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  PENDING: 'pending',
});

export const TIER_NAMES = Object.freeze({
  [TIERS.FREE]: 'Free',
  [TIERS.STANDARD]: 'Standard',
  [TIERS.PREMIUM]: 'Pro',
  [TIERS.PENDING]: 'Pending',
});

export const STANDARD_PACING = Object.freeze({
  FLEXIBLE: 'flexible',
  EVERY_OTHER_DAY: 'every_other_day',
});

export const ALLOWED_USER_TIERS = Object.freeze([
  TIERS.FREE,
  TIERS.STANDARD,
  TIERS.PREMIUM,
]);

export const ALLOWED_ADMIN_TIERS = Object.freeze([
  TIERS.FREE,
  TIERS.PENDING,
  TIERS.STANDARD,
  TIERS.PREMIUM,
]);

export const ACTIVE_SUBSCRIPTION_TIERS = Object.freeze([
  TIERS.STANDARD,
  TIERS.PREMIUM,
]);
