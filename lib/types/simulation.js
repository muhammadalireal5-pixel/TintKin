import './selfie.js';

/**
 * @typedef {Object} SimulationScenario
 * @property {string} label
 * @property {import('./selfie.js').SkinScores} projectedScores
 * @property {number} skinAgeDelta
 * @property {number} finalSkinAge
 * @property {string|null} imageUrl
 * @property {Array<import('./selfie.js').RecommendedProduct|string>} [products]
 */

/**
 * @typedef {Object} SimulationDeltas
 * @property {number} [wrinkles]
 * @property {number} [firmness]
 * @property {number} [spots]
 * @property {number} [radiance]
 * @property {number} [skinAge]
 */

/**
 * @typedef {Object} SimulationRecord
 * @property {string} _id
 * @property {string} userId
 * @property {string} name
 * @property {SimulationScenario} scenarioA
 * @property {SimulationScenario} scenarioB
 * @property {SimulationDeltas} deltas
 * @property {number} targetAge
 * @property {Date|string} createdAt
 */

export {};
