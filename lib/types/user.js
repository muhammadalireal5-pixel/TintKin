/**
 * @typedef {Object} UserLocation
 * @property {number|null} [lat]
 * @property {number|null} [lng]
 * @property {string|null} [city]
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} displayName
 * @property {string} email
 * @property {string} photoURL
 * @property {UserLocation|null} location
 * @property {'free'|'standard'|'premium'|'pending'} tier
 * @property {string|null} skinType
 * @property {boolean} optInComparison
 * @property {'every_other_day'|'flexible'} [standardPlanFrequency]
 * @property {'store'|'delete'} [photoPrivacy]
 */

/**
 * @typedef {Object} EnrichedAdminUser
 * @property {string} _id
 * @property {string} [firebaseUid]
 * @property {string} email
 * @property {string} firstName
 * @property {string} lastName
 * @property {string|null} imageUrl
 * @property {string} sex
 * @property {string} skinType
 * @property {string[]} goals
 * @property {string} customGoal
 * @property {boolean} onboardingComplete
 * @property {boolean} isSubscribed
 * @property {'free'|'standard'|'premium'|'pending'} tier
 * @property {string|null} subscribedAt
 * @property {string|null} birthDate
 * @property {number} scanCount
 * @property {number} extraScans
 * @property {number} simulationCount
 * @property {string|null} lastScan
 * @property {number|null} latestScore
 * @property {number|null} latestSkinAge
 * @property {boolean} isActive
 * @property {string|null} createdAt
 * @property {string|null} lastSignInAt
 */

export {};
