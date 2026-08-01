const BASE_VELOCITY =  {
    wrinkles: -1.8,
    firmness: -1.5,
    spots: -1.2,
    radiance: -1.0,
}

//always constant
const MULTIPLIERS = {
  spfDaily: 0.55,    // Daily SPF = -45% photoaging
  retinol: 0.6,      // 0.3% retinol 5x/week = -40% wrinkle/firmness loss
  lowSleep: 1.35,    // <6h sleep = +35% faster aging
  highUV: 1.5,       // >30min unprotected sun = +50%
  highSugar: 1.25,   // >5 added sugar servings = +25% glycation
  smoker: 1.4,       // 10+ cigs/day = +40%
  exercise: 0.85,    // 150min/week exercise = -15%
};

//when no user data
const DEFAULT_LIFESTYLE = {
  sleepHours: 7,
  spfUsed: false,
  uvMinutes: 20,
  sugarServings: 3,
  smokeCigarettes: 0,
  exerciseMinutes: 80,
};

//helpers
function linearRegression(points){
    const n = points.length
    if (n<2) return null
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (const[x,y] of points){
        sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    const denom = n * sumXX - sumX * sumX

    if(Math.abs(denom) < 1e-9 ) return null
    return (n * sumXY - sumX * sumY) / denom;
}

function computeBlendedVelocity(selfieHistory = [], concern){
    const valid = selfieHistory.filter( s=> s?.takenAt && typeof s?.scores?.[concern] ==="number").sort((a,b)=> new Date(a.takenAt) - new Date(b.takenAt) )

    //not enough data
    if (valid.length < 2) return { value: BASE_VELOCITY[concern] ?? -1, source: "baseline" };
    
    //convert to points
    const t0 = new Date(valid[0].takenAt).getTime()
    const points = valid.map(
        s=>[
            (new Date(s.takenAt).getTime() - t0) / (365.25 * 24 * 60 * 60 * 1000), // years
            s.scores[concern],
        ]
    )

    const userSlope = linearRegression(points);
    const daysOfData = (new Date(valid.at(-1).takenAt) - new Date(valid[0].takenAt)) / 86400000;

    //hardcoded if not enough data
    if (!userSlope || daysOfData < 14) return { value: BASE_VELOCITY[concern] ?? -1, source: "baseline" };

    const lambda = Math.min(0.7, 0.2 + (valid.length / 20) + (daysOfData / 180));
    const blended = lambda * userSlope + (1 - lambda) * (BASE_VELOCITY[concern] ?? -1);

    return {
        value: blended,
        source: valid.length >= 5 && daysOfData >= 30 ? "user" : "blended",
        userDataPoints: valid.length,
        daysOfData: Math.round(daysOfData),
    };
}

function normalizeLifestyle(lifestyleLogs = []) {
    if(!Array.isArray(lifestyleLogs) || lifestyleLogs.length ===0 ){
        return {...DEFAULT_LIFESTYLE, source:"default"}
    }

    //only last 30 days of data: old habits dont reflect current life
    const cutoff = Date.now() - 30 * 86400000
    const recent = lifestyleLogs.filter(
        l=> new Date(l.date ?? l.createdAt).getTime() > cutoff
    )
    const logs = recent.length > 0 ? recent : lifestyleLogs;

   const avg = (field) => {
    const vals = logs.map(l => l[field]).filter(v => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : DEFAULT_LIFESTYLE[field];
    };

    const majority = (field) => {
    const vals = logs.map(l => l[field]).filter(v => typeof v === "boolean");
    return vals.length ? vals.filter(Boolean).length > vals.length / 2 : DEFAULT_LIFESTYLE[field];
    };

  return {
    sleepHours: avg("sleepHours"),
    spfUsed: majority("spfUsed"),
    uvMinutes: avg("uvMinutes"),
    sugarServings: avg("sugarServings"),
    smokeCigarettes: avg("smokeCigarettes"),
    exerciseMinutes: avg("exerciseMinutes"),
    source: recent.length >= 7 ? "user" : "partial",
    logCount: logs.length,
  };
}

function getMultiplier(lifestyle = {}, interventions = []) {
    const l = {...DEFAULT_LIFESTYLE, ...lifestyle};
    let m = 1;

    // Apply coefficients (only if value crosses the threshold)
    if (l.sleepHours < 6) m *= MULTIPLIERS.lowSleep;
    if (l.uvMinutes > 30 && !l.spfUsed) m *= MULTIPLIERS.highUV;
    if (l.sugarServings > 5) m *= MULTIPLIERS.highSugar;
    if (l.smokeCigarettes >= 10) m *= MULTIPLIERS.smoker;
    if (l.exerciseMinutes >= 150) m *= MULTIPLIERS.exercise;
    if (l.spfUsed) m *= MULTIPLIERS.spfDaily;

    // Override with what-if interventions (HIGHEST priority)
    const list = Array.isArray(interventions) ? interventions : [interventions].filter(Boolean);
    for (const item of list) {
      if (item === "retinol" || item === "Serum") m *= 0.65;
      else if (item === "daily_spf" || item === "Sunscreen") m *= 0.60;
      else if (item === "exfoliant" || item === "Exfoliant") m *= 0.70;
      else if (item === "moisturizer" || item === "Moisturizer") m *= 0.80;
      else if (item === "cleanser" || item === "Cleanser") m *= 0.88;
      else if (item === "no_sugar") m /= MULTIPLIERS.highSugar;
    }

    return Math.max(0.3, Math.min(2.2, m));
}

/**
 * Project skin scores X years into the future
 * @param {Object} baselineScores - Current scores from latest selfie {wrinkles, firmness, ...}
 * @param {Number} years - Years to project (5/10/20)
 * @param {Object|Array} [lifestyle] - Single lifestyle obj OR array of lifestyle logs
 * @param {Array} [interventions] - What-if overrides ["retinol", "daily_spf", ...]
 * @param {Array} [selfieHistory] - ALL user selfies (for dynamic velocity)
 * @returns {Object} Projected scores + metadata for UI
 */

export function projectTrajectory(
  baselineScores = {},
  years = 10,
  lifestyle = [],
  interventions = [],
  selfieHistory = []
){
    //1 normalize
    const normalizedLifestyle = Array.isArray(lifestyle) ? normalizeLifestyle(lifestyle) : {...DEFAULT_LIFESTYLE, ...lifestyle, source:"partial"}
    const mult = getMultiplier(normalizedLifestyle, interventions)

    //2 project conerns
    const result = {scores:{}, meta:{}}
    let velocitySource = "baseline";
    let totalDataPoints = 0
    let totalDays = 0

    for (const [concern, baseline] of Object.entries(baselineScores)) {
        if(typeof baseline !== "number") continue;

        //dynamic velocity (if possible)
        const velData = computeBlendedVelocity(selfieHistory, concern);
        const baseVel = velData.value;
        if (velData.source === "user") velocitySource = "user";
        else if (velData.source === "blended" && velocitySource !== "user") velocitySource = "blended";
        totalDataPoints = Math.max(totalDataPoints, velData.userDataPoints ?? 0);
        totalDays = Math.max(totalDays, velData.daysOfData ?? 0);

        // Apply lifestyle multiplier + compound forward
        let score = baseline;
        let vel = baseVel * mult;
        for (let y = 0; y < years; y++) {
          score = Math.max(10, score + vel); // Floor at 10 (can't get worse than that)
          vel *= 1.02; // Aging accelerates ~2%/year biologically
        }

        result.scores[concern] = Math.round(score * 10) / 10;
    }

    //3 derive skin age
    //negative == younger, positive = older

    result.skinAgeDelta = Math.round((1-mult) * years * 10)/10
    result.lifestyleMultiplier = Math.round(mult * 100) / 100;

    //step 4, metadeta for ui
    result.meta = {
    velocitySource, // "user" | "blended" | "baseline"
    lifestyleSource: normalizedLifestyle.source, // "user" | "partial" | "default"
    dataPoints: totalDataPoints,
    daysOfHistory: totalDays,
    interventionsApplied: interventions,
    projectionYears: years,
    };

    return result;
}
