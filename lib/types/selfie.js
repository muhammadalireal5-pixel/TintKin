/**
 * @typedef {Object} SkinScores
 * @property {number} wrinkles
 * @property {number} firmness
 * @property {number} spots
 * @property {number} radiance
 */

/**
 * @typedef {Object} RecommendedProduct
 * @property {'Cleanser'|'Serum'|'Moisturizer'|'Sunscreen'|'Exfoliant'} type
 * @property {string} formula
 * @property {string} description
 * @property {number} [customMultiplier]
 * @property {boolean} [isCustom]
 */

/**
 * @typedef {Object} SelfieRecord
 * @property {string} _id
 * @property {string} userId
 * @property {string|null} imageUrl
 * @property {boolean} isAnalyzed
 * @property {Date|string} takenAt
 * @property {number|null} overallScore
 * @property {number|null} skinAge
 * @property {SkinScores} scores
 * @property {string} [critique]
 * @property {string[]} [habits]
 * @property {string} [facialWorkout]
 * @property {string[]} [amRoutine]
 * @property {string[]} [pmRoutine]
 * @property {RecommendedProduct[]} [recommendedProducts]
 */

export {};
