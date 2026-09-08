/**
 * TintKin Skincare & Longevity Achievements System
 * 
 * Defines the 7 canonical achievements, their unlock criteria,
 * visual styles, and evaluation logic.
 */

export const ACHIEVEMENTS = [
  {
    id: "first_glow",
    title: "First Glow",
    subtitle: "Genesis Scan",
    description: "Logged your first clinical AI skin analysis.",
    category: "Milestone",
    rarity: "Common",
    rarityColor: "#64748B",
    iconName: "Sparkles",
    accentColor: "#D97706",
    gradientClass: "from-amber-500/15 to-orange-500/10",
    borderClass: "border-amber-500/30",
    glowColor: "rgba(217, 119, 6, 0.25)",
  },
  {
    id: "week_radiance",
    title: "Week of Radiance",
    subtitle: "7-Day Consistency",
    description: "Maintained a 7-day daily skin logging streak.",
    category: "Streak",
    rarity: "Rare",
    rarityColor: "#3B82F6",
    iconName: "Flame",
    accentColor: "#EA580C",
    gradientClass: "from-orange-500/15 to-red-500/10",
    borderClass: "border-orange-500/30",
    glowColor: "rgba(234, 88, 12, 0.25)",
  },
  {
    id: "routine_master",
    title: "Routine Master",
    subtitle: "Habit Perfection",
    description: "Completed all recommended AM & PM daily routines.",
    category: "Habit",
    rarity: "Uncommon",
    rarityColor: "#0EA5E9",
    iconName: "CheckCircle2",
    accentColor: "#2563EB",
    gradientClass: "from-blue-500/15 to-indigo-500/10",
    borderClass: "border-blue-500/30",
    glowColor: "rgba(37, 99, 235, 0.25)",
  },
  {
    id: "future_gazer",
    title: "Future Gazer",
    subtitle: "Simulation Explorer",
    description: "Ran an AI What-If skin longevity trajectory simulation.",
    category: "Explorer",
    rarity: "Uncommon",
    rarityColor: "#0EA5E9",
    iconName: "Clock",
    accentColor: "#7C3AED",
    gradientClass: "from-purple-500/15 to-indigo-500/10",
    borderClass: "border-purple-500/30",
    glowColor: "rgba(124, 58, 237, 0.25)",
  },
  {
    id: "youth_catalyst",
    title: "Youth Catalyst",
    subtitle: "Biological Age Beat",
    description: "Achieved a Skin Age younger than your biological real age.",
    category: "Vitality",
    rarity: "Epic",
    rarityColor: "#8B5CF6",
    iconName: "Zap",
    accentColor: "#059669",
    gradientClass: "from-emerald-500/15 to-teal-500/10",
    borderClass: "border-emerald-500/30",
    glowColor: "rgba(5, 150, 105, 0.25)",
  },
  {
    id: "ingredient_alchemist",
    title: "Ingredient Alchemist",
    subtitle: "Formulation Decoder",
    description: "Scanned a physical skincare product bottle with Vision AI.",
    category: "Science",
    rarity: "Rare",
    rarityColor: "#3B82F6",
    iconName: "FlaskConical",
    accentColor: "#DB2777",
    gradientClass: "from-pink-500/15 to-rose-500/10",
    borderClass: "border-pink-500/30",
    glowColor: "rgba(219, 39, 119, 0.25)",
  },
  {
    id: "consistency_champion",
    title: "Consistency Champion",
    subtitle: "Cellular Renewal",
    description: "Achieved a 30-day streak or completed 30 total skin scans.",
    category: "Mastery",
    rarity: "Legendary",
    rarityColor: "#F59E0B",
    iconName: "Crown",
    accentColor: "#D97706",
    gradientClass: "from-amber-400/20 via-yellow-500/15 to-orange-500/10",
    borderClass: "border-amber-500/40",
    glowColor: "rgba(245, 158, 11, 0.35)",
  },
];

/**
 * Evaluates which achievements a user qualifies for.
 * Handles both ID-based badges and legacy string badges for backward compatibility.
 */
export function evaluateUserAchievements({
  user = {},
  allSelfies = [],
  simulationCount = 0,
  todayRoutineLog = null,
  realAge = null,
}) {
  const existingBadges = Array.isArray(user.badges) ? user.badges : [];
  const streak = user.currentStreak || 0;
  const longestStreak = user.longestStreak || 0;
  const scanCount = Math.max(user.scanCount || 0, allSelfies.length);
  const bestStreak = Math.max(streak, longestStreak);

  // Check latest selfie for biological youth catalyst
  const latestSelfie = allSelfies?.[0];
  const hasBeatenAge = (
    latestSelfie &&
    typeof latestSelfie.skinAge === "number" &&
    typeof realAge === "number" &&
    latestSelfie.skinAge < realAge
  );

  const hasRoutineCompleted = (
    (todayRoutineLog?.amCompleted?.length > 0 && todayRoutineLog?.pmCompleted?.length > 0) ||
    existingBadges.includes("routine_master") ||
    existingBadges.includes("Routine Master")
  );

  const newlyUnlockedIds = [];

  const evaluated = ACHIEVEMENTS.map((ach) => {
    let isUnlocked = existingBadges.includes(ach.id) || existingBadges.includes(ach.title);
    let progress = "";
    let percent = 0;

    switch (ach.id) {
      case "first_glow":
        if (scanCount >= 1) isUnlocked = true;
        progress = isUnlocked ? "1/1 Scan" : `${scanCount}/1 Scan`;
        percent = isUnlocked ? 100 : Math.min(100, scanCount * 100);
        break;

      case "week_radiance":
        if (bestStreak >= 7) isUnlocked = true;
        progress = isUnlocked ? "7/7 Days" : `${Math.min(7, bestStreak)}/7 Days`;
        percent = isUnlocked ? 100 : Math.min(100, Math.round((bestStreak / 7) * 100));
        break;

      case "routine_master":
        if (hasRoutineCompleted) isUnlocked = true;
        const amSteps = todayRoutineLog?.amCompleted?.length || 0;
        const pmSteps = todayRoutineLog?.pmCompleted?.length || 0;
        const totalSteps = amSteps + pmSteps;
        progress = isUnlocked ? "AM + PM Done" : totalSteps > 0 ? `${totalSteps} steps completed` : "0% AM/PM";
        percent = isUnlocked ? 100 : Math.min(90, totalSteps * 20);
        break;

      case "future_gazer":
        if (simulationCount > 0 || (user.simulationsUsed || 0) > 0) isUnlocked = true;
        const sims = Math.max(simulationCount, user.simulationsUsed || 0);
        progress = isUnlocked ? "1/1 Sim" : `${sims}/1 Sim`;
        percent = isUnlocked ? 100 : (sims > 0 ? 100 : 0);
        break;

      case "youth_catalyst":
        if (hasBeatenAge) isUnlocked = true;
        progress = isUnlocked 
          ? `Skin ${latestSelfie.skinAge} vs Real ${realAge}`
          : latestSelfie?.skinAge && realAge 
            ? `Skin ${latestSelfie.skinAge} / Real ${realAge}`
            : "Beat Real Age";
        percent = isUnlocked ? 100 : 0;
        break;

      case "ingredient_alchemist":
        // Keep unlocked if user was ever awarded this
        if (existingBadges.includes("ingredient_alchemist") || existingBadges.includes("Ingredient Alchemist")) {
          isUnlocked = true;
        }
        progress = isUnlocked ? "Unlocked" : "Scan a bottle";
        percent = isUnlocked ? 100 : 0;
        break;

      case "consistency_champion":
        if (bestStreak >= 30 || scanCount >= 30) isUnlocked = true;
        const consistencyVal = Math.max(bestStreak, scanCount);
        progress = isUnlocked ? "30/30 Days" : `${Math.min(30, consistencyVal)}/30 Days`;
        percent = isUnlocked ? 100 : Math.min(100, Math.round((consistencyVal / 30) * 100));
        break;

      default:
        break;
    }

    if (isUnlocked && !existingBadges.includes(ach.id)) {
      newlyUnlockedIds.push(ach.id);
    }

    return {
      ...ach,
      isUnlocked,
      progress,
      percent,
    };
  });

  const allUnlockedIds = evaluated.filter(e => e.isUnlocked).map(e => e.id);

  return {
    evaluatedAchievements: evaluated,
    unlockedCount: evaluated.filter(e => e.isUnlocked).length,
    totalCount: ACHIEVEMENTS.length,
    allUnlockedIds,
    newlyUnlockedIds,
  };
}
