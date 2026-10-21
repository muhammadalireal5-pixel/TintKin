/**
 * TintKin milestone ladder.
 *
 * A short, plain list of things worth celebrating once. Every milestone
 * rewards showing up (days of care, routines, exploring), never a skin score
 * outcome, which swings with lighting. Visual styling is left to the active
 * theme (see TrophyCase), so there are no per-badge colors or rarity tiers.
 *
 * Ids from the earlier badge set are kept where the meaning survives
 * (first_glow, week_radiance, routine_master, future_gazer,
 * ingredient_alchemist) so badges users already hold stay unlocked.
 */

export const ACHIEVEMENTS = [
  { id: "first_glow", title: "First scan", subtitle: "Your starting point", description: "Took your first skin scan.", group: "Start", iconName: "Sparkles" },
  { id: "three_days", title: "Three days in", subtitle: "A habit is forming", description: "Showed up for your skin on 3 different days.", group: "Rhythm", iconName: "Sprout" },
  { id: "week_radiance", title: "A week of care", subtitle: "7-day streak", description: "Kept a 7-day care streak, by scanning or ticking off your routine.", group: "Rhythm", iconName: "Flame", reward: "A free What-If simulation" },
  { id: "routine_master", title: "Full routine day", subtitle: "Morning and evening", description: "Finished every morning and evening step in a single day.", group: "Routine", iconName: "CheckCircle2" },
  { id: "routine_week", title: "First routine week", subtitle: "7 days of routine", description: "Ticked off routine steps on 7 different days.", group: "Routine", iconName: "CalendarCheck" },
  { id: "future_gazer", title: "What-If explorer", subtitle: "Peeked at the future", description: "Ran a What-If simulation.", group: "Explore", iconName: "Clock" },
  { id: "ingredient_alchemist", title: "Label reader", subtitle: "Know what's in it", description: "Scanned a skincare product label.", group: "Explore", iconName: "FlaskConical" },
  { id: "first_report", title: "First skin report", subtitle: "Your story so far", description: "Generated your first skin report.", group: "Journey", iconName: "FileText" },
  { id: "first_improvement", title: "A step forward", subtitle: "Compared to your start", description: "Your recent scans average at least 3 points above your first ones. Only ever compared with you.", group: "Journey", iconName: "TrendingUp" },
  { id: "thirty_days", title: "30 days of care", subtitle: "A real routine", description: "Showed up for your skin on 30 different days.", group: "Rhythm", iconName: "Heart", reward: "A free What-If simulation", legacyIds: ["consistency_champion"] },
  { id: "sixty_days", title: "60 days of care", subtitle: "Going strong", description: "Showed up for your skin on 60 different days.", group: "Rhythm", iconName: "Award" },
  { id: "hundred_days", title: "100 days of care", subtitle: "A lasting habit", description: "Showed up for your skin on 100 different days.", group: "Rhythm", iconName: "Crown" },
];

/** Free What-If simulations granted once, when the milestone first unlocks. */
export const MILESTONE_REWARDS = {
  week_radiance: { simulations: 1 },
  thirty_days: { simulations: 1 },
};

export const IMPROVEMENT_POINTS = 3;

/**
 * Evaluates which milestones a user has reached.
 * Handles both ID-based badges and legacy string badges for backward compatibility.
 */
export function evaluateUserAchievements({
  user = {},
  allSelfies = [],
  simulationCount = 0,
  todayRoutineLog = null,
  amRoutine = [],
  pmRoutine = [],
  selfieCount = null,
  reportCount = 0,
  baselineScores = [],
  recentScores = [],
}) {
  const existingBadges = Array.isArray(user.badges) ? user.badges : [];
  const bestStreak = Math.max(user.currentStreak || 0, user.longestStreak || 0);
  // selfieCount lets callers that pass only a window of allSelfies supply the
  // full-history value this function would otherwise read from it.
  const scanCount = Math.max(user.scanCount || 0, selfieCount ?? allSelfies.length);
  // Accounts from before routine days counted fall back to their best streak.
  const activeDays = Math.max(user.activeDays || 0, bestStreak);
  const routineDays = user.routineDays || 0;
  const safeAmRoutine = Array.isArray(amRoutine) ? amRoutine : [];
  const safePmRoutine = Array.isArray(pmRoutine) ? pmRoutine : [];

  const amAllDone = safeAmRoutine.length > 0 && safeAmRoutine.every((s) => todayRoutineLog?.amCompleted?.includes(s));
  const pmAllDone = safePmRoutine.length > 0 && safePmRoutine.every((s) => todayRoutineLog?.pmCompleted?.includes(s));

  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const hasEnoughToCompare = baselineScores.length >= 3 && recentScores.length >= 3 && scanCount >= 6;
  const improvement = hasEnoughToCompare ? Math.round(avg(recentScores) - avg(baselineScores)) : null;

  const daysProgress = (n) => ({
    progress: `${Math.min(n, activeDays)}/${n} days`,
    percent: Math.min(100, Math.round((activeDays / n) * 100)),
  });

  const newlyUnlockedIds = [];

  const evaluated = ACHIEVEMENTS.map((ach) => {
    const held = [ach.id, ach.title, ...(ach.legacyIds || [])].some((b) => existingBadges.includes(b));
    let isUnlocked = held;
    let progress = "";
    let percent = 0;

    switch (ach.id) {
      case "first_glow":
        if (scanCount >= 1) isUnlocked = true;
        progress = isUnlocked ? "Done" : "0/1 scan";
        percent = isUnlocked ? 100 : 0;
        break;

      case "three_days":
        if (activeDays >= 3) isUnlocked = true;
        ({ progress, percent } = daysProgress(3));
        break;

      case "week_radiance":
        if (bestStreak >= 7) isUnlocked = true;
        progress = `${Math.min(7, bestStreak)}/7 days`;
        percent = Math.min(100, Math.round((bestStreak / 7) * 100));
        break;

      case "routine_master": {
        if (amAllDone && pmAllDone) isUnlocked = true;
        const steps = (todayRoutineLog?.amCompleted?.length || 0) + (todayRoutineLog?.pmCompleted?.length || 0);
        const expected = safeAmRoutine.length + safePmRoutine.length;
        progress = steps > 0 && expected > 0 ? `${Math.min(steps, expected)}/${expected} steps today` : "Finish a full day";
        percent = expected > 0 ? Math.min(90, Math.round((Math.min(steps, expected) / expected) * 100)) : 0;
        break;
      }

      case "routine_week":
        if (routineDays >= 7) isUnlocked = true;
        progress = `${Math.min(7, routineDays)}/7 days`;
        percent = Math.min(100, Math.round((routineDays / 7) * 100));
        break;

      case "future_gazer": {
        const sims = Math.max(simulationCount, user.simulationsUsed || 0);
        if (sims > 0) isUnlocked = true;
        progress = isUnlocked ? "Done" : "Run a simulation";
        percent = sims > 0 ? 100 : 0;
        break;
      }

      case "ingredient_alchemist":
        // Only ever granted when a label is scanned (see analyzeProductImage).
        progress = isUnlocked ? "Done" : "Scan a product label";
        break;

      case "first_report":
        if (reportCount > 0) isUnlocked = true;
        progress = isUnlocked ? "Done" : "Generate a report";
        percent = isUnlocked ? 100 : 0;
        break;

      case "first_improvement":
        if (improvement !== null && improvement >= IMPROVEMENT_POINTS) isUnlocked = true;
        progress = isUnlocked ? "Done" : scanCount >= 6 ? "Keep going" : `${Math.min(6, scanCount)}/6 scans`;
        percent = isUnlocked ? 100 : Math.min(90, Math.round((Math.min(6, scanCount) / 6) * 100));
        break;

      case "thirty_days":
        if (activeDays >= 30) isUnlocked = true;
        ({ progress, percent } = daysProgress(30));
        break;

      case "sixty_days":
        if (activeDays >= 60) isUnlocked = true;
        ({ progress, percent } = daysProgress(60));
        break;

      case "hundred_days":
        if (activeDays >= 100) isUnlocked = true;
        ({ progress, percent } = daysProgress(100));
        break;

      default:
        break;
    }

    if (isUnlocked) {
      progress = "Done";
      percent = 100;
    }
    // Milestones already held under a legacy id are not "new", so a reward is
    // never paid out twice.
    if (isUnlocked && !held) newlyUnlockedIds.push(ach.id);

    return { ...ach, isUnlocked, progress, percent };
  });

  return {
    evaluatedAchievements: evaluated,
    unlockedCount: evaluated.filter((e) => e.isUnlocked).length,
    totalCount: ACHIEVEMENTS.length,
    allUnlockedIds: evaluated.filter((e) => e.isUnlocked).map((e) => e.id),
    newlyUnlockedIds,
  };
}
