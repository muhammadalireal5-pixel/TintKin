// Priced against YouCam's own real cost: $24 for 500 credits ($0.048/credit).
// A skin scan costs YouCam 9 credits ($0.432); a simulation costs 4 ($0.192).
export const CREDIT_COST = Object.freeze({
  scan: 9,
  simulation: 4,
});

// Seed value only — used the first time ShopSettings is created (see
// lib/utils/shop.js). After that, the real price lives in the database and
// is managed from /admin/shop.
export const DEFAULT_PRICE_PER_CREDIT_CENTS = 4.8;
export const DEFAULT_MIN_CUSTOM_CREDITS = 50;
export const DEFAULT_MAX_CUSTOM_CREDITS = 5000;
