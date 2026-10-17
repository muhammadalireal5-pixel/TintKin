import { SKIN_METRICS, METRIC_LABELS } from "@/lib/constants/metrics";

const METRIC_ORDER = [SKIN_METRICS.WRINKLES, SKIN_METRICS.FIRMNESS, SKIN_METRICS.SPOTS, SKIN_METRICS.RADIANCE];

// Short names for the four-up metric row on the Today screen.
const SHORT_LABELS = {
  [SKIN_METRICS.WRINKLES]: "Wrinkles",
  [SKIN_METRICS.FIRMNESS]: "Firmness",
  [SKIN_METRICS.SPOTS]: "Spots",
  [SKIN_METRICS.RADIANCE]: "Radiance",
};

// What "needs love" means for each metric, in plain words.
const FOCUS_TEXT = {
  [SKIN_METRICS.WRINKLES]: "Fine lines respond to hydration and gentle retinoid-style care.",
  [SKIN_METRICS.FIRMNESS]: "Support your skin's bounce with hydration, SPF and sleep.",
  [SKIN_METRICS.SPOTS]: "Brighten and protect: daily SPF is the biggest lever for spots.",
  [SKIN_METRICS.RADIANCE]: "Boost your glow with hydration, gentle exfoliation and rest.",
};

export function scoreBand(score) {
  if (typeof score !== "number") return null;
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  return "Needs care";
}

function firstSentence(text) {
  if (!text || typeof text !== "string") return "";
  const m = text.trim().match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

/**
 * Plain, serialisable view-model for the Today screen, derived from
 * getLatestData(). Kept out of the page so Today and Progress share the
 * same rules (bands, deltas, focus metric).
 */
export function buildSkinSummary({
  user,
  sourceData,
  latestSelfie,
  allSelfies = [],
  realAge,
  weeklyAverage,
  todayRoutineLog,
  achievementStats,
  reportReady = false,
}) {
  const { overallScore, skinAge, scores, critique, amRoutine, pmRoutine, facialWorkout } = sourceData;

  // Previous analysed scan, for "vs. last scan" deltas. allSelfies is oldest → newest.
  const analysed = allSelfies.filter((s) => s.isAnalyzed !== false && typeof s.overallScore === "number");
  const idx = sourceData._id ? analysed.findIndex((s) => s._id === sourceData._id) : analysed.length - 1;
  const prev = idx > 0 ? analysed[idx - 1] : null;

  const delta = prev && typeof overallScore === "number" ? overallScore - prev.overallScore : null;

  const metrics = METRIC_ORDER.map((key) => ({
    key,
    label: SHORT_LABELS[key],
    fullLabel: METRIC_LABELS[key],
    today: typeof scores?.[key] === "number" ? scores[key] : null,
    week: typeof weeklyAverage?.scores?.[key] === "number" ? weeklyAverage.scores[key] : null,
    delta: prev && typeof scores?.[key] === "number" && typeof prev.scores?.[key] === "number"
      ? scores[key] - prev.scores[key]
      : null,
  }));

  // Focus = the weakest metric; if everything is strong, maintain.
  const scored = metrics.filter((m) => typeof m.today === "number");
  const weakest = scored.length ? scored.reduce((a, b) => (b.today < a.today ? b : a)) : null;
  const allStrong = weakest && weakest.today >= 80;
  const focus = allStrong || !weakest
    ? {
        title: "Maintain your routine",
        text: firstSentence(critique) || "Your skin is balanced. Keep up your routine for continued progress.",
      }
    : {
        title: `Support your ${weakest.label.toLowerCase()}`,
        text: firstSentence(critique) || FOCUS_TEXT[weakest.key],
      };

  const hasSkinAge = typeof skinAge === "number";
  const hasRealAge = typeof realAge === "number";
  let skinAgeLine = null;
  if (hasSkinAge && hasRealAge) {
    const diff = realAge - skinAge;
    skinAgeLine = diff > 0
      ? `Skin age ${skinAge} · ${diff} ${diff === 1 ? "year" : "years"} younger than you`
      : diff < 0
        ? `Skin age ${skinAge} · ${-diff} ${diff === -1 ? "year" : "years"} above your age`
        : `Skin age ${skinAge} · right on your age`;
  } else if (hasSkinAge) {
    skinAgeLine = `Skin age ${skinAge}`;
  }

  const amTotal = amRoutine?.length || 0;
  const pmTotal = pmRoutine?.length || 0;
  const hasProducts = Array.isArray(latestSelfie?.recommendedProducts) && latestSelfie.recommendedProducts.length > 0;

  const firstName = (user?.displayName || "").trim().split(/\s+/)[0] || "";

  return {
    firstName,
    score: typeof overallScore === "number" ? overallScore : null,
    delta,
    band: scoreBand(overallScore),
    skinAgeLine,
    photoUrl: sourceData.imageUrl || latestSelfie?.imageUrl || null,
    metrics,
    weekScore: {
      overall: typeof weeklyAverage?.overallScore === "number" ? weeklyAverage.overallScore : null,
      scanCount: weeklyAverage?.scanCount || 0,
    },
    focus,
    plan: {
      amTotal,
      pmTotal,
      amDone: Math.min(amTotal, todayRoutineLog?.amCompleted?.length || 0),
      pmDone: Math.min(pmTotal, todayRoutineLog?.pmCompleted?.length || 0),
      hasWorkout: Boolean(facialWorkout),
      productCount: hasProducts ? latestSelfie.recommendedProducts.length : 3,
    },
    streak: user?.currentStreak || 0,
    trophies: achievementStats || null,
    reportReady,
  };
}
