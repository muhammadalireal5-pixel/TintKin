/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} description
 * @property {string} category
 * @property {'Common'|'Uncommon'|'Rare'|'Epic'|'Legendary'} rarity
 * @property {string} rarityColor
 * @property {string} iconName
 * @property {string} accentColor
 * @property {string} gradientClass
 * @property {string} borderClass
 * @property {string} glowColor
 */

/**
 * @typedef {Achievement & { isUnlocked: boolean, progress: string, percent: number }} EvaluatedAchievement
 */

export {};
