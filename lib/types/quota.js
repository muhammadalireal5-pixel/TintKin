/**
 * @typedef {Object} ScanQuota
 * @property {number} usedToday
 * @property {number} usedMonth
 * @property {number} dailyLimit
 * @property {number} monthlyLimit
 * @property {boolean} canScanToday
 * @property {string} denialReason
 * @property {boolean} wouldBeDenied
 */

/**
 * @typedef {Object} SimulationQuota
 * @property {number} used
 * @property {number} limit
 */

/**
 * @typedef {Object} UsageQuotas
 * @property {ScanQuota} scans
 * @property {SimulationQuota} simulations
 */

export {};
