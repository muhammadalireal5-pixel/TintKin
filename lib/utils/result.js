import { STATUS } from '../constants/status';

/**
 * Constructs a successful operation envelope.
 * @param {Record<string, any>} [data]
 * @returns {Record<string, any>}
 */
export function okResult(data = {}) {
  return {
    status: STATUS.OK,
    success: true,
    ...data,
  };
}

/**
 * Constructs an error operation envelope.
 * @param {string} errorCode - One of ERROR_CODES
 * @param {string} message - User-facing or internal error message
 * @param {Record<string, any>} [extra]
 * @returns {Record<string, any>}
 */
export function errorResult(errorCode, message, extra = {}) {
  return {
    status: STATUS.ERROR,
    success: false,
    errorCode,
    message,
    ...extra,
  };
}

/**
 * Constructs a partial success envelope (e.g. biomarkers captured but advice unavailable).
 * @param {Record<string, any>} data - The successfully captured data
 * @param {string} warningCode - Code explaining what was omitted/incomplete
 * @param {string} [message] - Human-friendly explanation
 * @returns {Record<string, any>}
 */
export function partialResult(data = {}, warningCode, message = '') {
  return {
    status: STATUS.PARTIAL,
    success: true,
    warningCode,
    message,
    ...data,
  };
}
