/**
 * @typedef {Object} LifestyleLog
 * @property {string} [_id]
 * @property {string} [userId]
 * @property {Date|string} [date]
 * @property {number} [sleepHours]
 * @property {boolean} [spfUsed]
 * @property {number} [uvMinutes]
 * @property {number} [sugarServings]
 * @property {number} [smokeCigarettes]
 * @property {number} [exerciseMinutes]
 */

/**
 * @typedef {Object} NormalizedLifestyle
 * @property {number} sleepHours
 * @property {boolean} spfUsed
 * @property {number} uvMinutes
 * @property {number} sugarServings
 * @property {number} smokeCigarettes
 * @property {number} exerciseMinutes
 * @property {'user'|'partial'|'default'} source
 * @property {number} logCount
 */

export {};
