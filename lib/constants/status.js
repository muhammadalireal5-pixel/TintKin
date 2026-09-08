/**
 * Standard status states for asynchronous operations, services, and envelopes.
 */
export const STATUS = Object.freeze({
  OK: "ok",
  PENDING: "pending",
  ERROR: "error",
  PARTIAL: "partial",
  EMPTY: "empty",
});

/**
 * Machine-readable error codes.
 */
export const ERROR_CODES = Object.freeze({
  UNAUTHORIZED: "UNAUTHORIZED",
  SCAN_LIMIT: "SCAN_LIMIT",
  SIM_LIMIT: "SIM_LIMIT",
  NO_BASELINE: "NO_BASELINE",
  SIMULATION_FAILED: "SIMULATION_FAILED",
  SIMULATION_IMAGE_FAILED: "SIMULATION_IMAGE_FAILED",
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  AI_ADVICE_UNAVAILABLE: "AI_ADVICE_UNAVAILABLE",
  SYNC_FAILED: "SYNC_FAILED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
});
