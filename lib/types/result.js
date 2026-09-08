/**
 * JSDoc definitions for standard result envelopes and operational statuses.
 */

/**
 * @typedef {'ok' | 'pending' | 'error' | 'partial' | 'empty'} OperationStatus
 */

/**
 * @typedef {Object} ServiceResult
 * @property {OperationStatus} status - Standard status code
 * @property {boolean} success - Backward-compatible boolean (true if ok or partial)
 * @property {string} [errorCode] - Machine-readable error code
 * @property {string} [message] - Human-friendly explanation
 * @property {Record<string, any>} [data] - Additional data properties
 */

export {};
