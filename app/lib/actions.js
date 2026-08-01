"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { User, Selfie, Lifestyle } from "./mongoose";
import { analyzeSkin, simulateSkin, extractScoreInfo } from "./youcam";
import { projectTrajectory } from "./predict";
import { generatePersonalizedAdvice } from "./qwen";

// ------------------------------
// Helper: Get/create DB user from Clerk
// ------------------------------
async function getDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  let user = await User.findOne({ clerkId: clerkUser.id });
  if (!user) {
    // Create user if first login (fill birthDate/sex in onboarding later—hardcode demo for now)
    user = await User.create({
      clerkId: clerkUser.id,
    });
  }
  if (!user.onboardingComplete) {
    redirect("/onboarding");
  }
  return user;
}

// ------------------------------
// 1. Capture: Upload → YouCam → Save to DB
// ------------------------------
export async function analyzeAndSaveSelfie(imageUrl) {
  const user = await getDbUser();

  try {
    if (!imageUrl) throw new Error("No image provided");

    // Call YouCam API (server-only)
    const youCamResult = await analyzeSkin(imageUrl);
    const data = youCamResult.results || youCamResult.result || youCamResult.task_result || youCamResult;

    // Extract scores using the unified parser (handles inline JSON + ZIP shapes)
    const scoreInfo = await extractScoreInfo(data);
    console.log("[Scores] Extracted scoreInfo:", JSON.stringify(scoreInfo, null, 2));

    // Read individual concern scores (prefer ui_score, fall back to raw_score)
    const readScore = (key, label) => {
      const entry = scoreInfo[key];
      if (!entry) {
        console.warn(`[Scores] ⚠️ Key "${key}" missing from scoreInfo — no score available for ${label}`);
        return null;
      }
      if (typeof entry === "number") return entry;
      const val = entry.ui_score ?? entry.raw_score ?? entry.score ?? entry.value;
      if (val === undefined || val === null) {
        console.warn(`[Scores] ⚠️ Key "${key}" present but has no ui_score/raw_score:`, entry);
        return null;
      }
      return val;
    };

    const scores = {
      wrinkles: readScore("wrinkle", "wrinkles"),
      firmness: readScore("firmness", "firmness"),
      spots: readScore("age_spot", "spots"),
      radiance: readScore("radiance", "radiance"),
    };

    // Warn loudly if any score is null (genuinely missing from the API response)
    for (const [label, val] of Object.entries(scores)) {
      if (val === null) {
        console.warn(`[Scores] ⚠️ "${label}" resolved to null — check YouCam response shape`);
      }
    }

    // Overall score & skin age
    const overallScore = scoreInfo.all?.score ?? scoreInfo.overall_score ?? null;
    const skinAge = scoreInfo.skin_age ?? scoreInfo.age ?? null;

    if (overallScore === null) {
      console.warn("[Scores] ⚠️ overall score missing from scoreInfo:", JSON.stringify(scoreInfo, null, 2));
    }
    if (skinAge === null) {
      console.warn("[Scores] ⚠️ skin age missing from scoreInfo:", JSON.stringify(scoreInfo, null, 2));
    }

    // Log fully parsed results before saving
    console.log("[Scores] ✅ Final parsed values:", {
      scores,
      overallScore,
      skinAge,
    });

    // Check if we can reuse previous advice
    const lastSelfie = await Selfie.findOne({ userId: user._id }).sort({ takenAt: -1 });
    let useCachedAdvice = false;

    if (lastSelfie && lastSelfie.scores && lastSelfie.critique) {
      if (
        lastSelfie.overallScore === overallScore &&
        lastSelfie.skinAge === skinAge &&
        lastSelfie.scores.wrinkles === scores.wrinkles &&
        lastSelfie.scores.firmness === scores.firmness &&
        lastSelfie.scores.spots === scores.spots &&
        lastSelfie.scores.radiance === scores.radiance
      ) {
        useCachedAdvice = true;
      }
    }

    let advice;
    if (useCachedAdvice) {
      console.log("[Scores] Using cached advice (scores unchanged from previous selfie)");
      advice = {
        critique: lastSelfie.critique,
        habits: lastSelfie.habits,
        facialWorkout: lastSelfie.facialWorkout,
        products: lastSelfie.recommendedProducts,
      };
    } else {
      // Call Qwen to generate personalized advice based on scores and user goals
      advice = await generatePersonalizedAdvice(user, scores, overallScore, skinAge);
    }

    let recommendedProducts = advice.products || []
    if(!Array.isArray(recommendedProducts) || recommendedProducts.length !== 3 ){
      recommendedProducts = [
    {
      type: "Cleanser",
      formula: "Gentle Hydrating Cleanser",
      description: "Mild cleanser that maintains your skin barrier.",
    },
    {
      type: "Serum",
      formula: "Vitamin C + Niacinamide",
      description: "Brightens tone and fades dark spots.",
    },
    {
      type: "Moisturizer",
      formula: "Ceramide Cream",
      description: "Locks in moisture and strengthens barrier.",
    },
    ]
    }

    // Save selfie to DB along with the generated advice
    const selfie = await Selfie.create({
      userId: user._id,
      imageUrl,
      overallScore,
      skinAge,
      scores,
      maskUrls: youCamResult.masks ?? {},
      youCamTaskId: youCamResult.task_id,
      critique: advice.critique,
      habits: advice.habits,
      facialWorkout: advice.facialWorkout,
      recommendedProducts,
    });

    // Update user's baseline selfie
    await User.findByIdAndUpdate(user._id, { baselineSelfie: imageUrl });

    return { success: true, selfieId: selfie._id.toString() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ------------------------------
// 2. Shared: Fetch latest selfie + user data
// ------------------------------
export async function getLatestData() {
  const user = await getDbUser();
  const latestSelfie = await Selfie.findOne({ userId: user._id }).sort({ takenAt: -1 });
  const allSelfies = await Selfie.find({ userId: user._id }).sort({ takenAt: 1 });
  const lifestyleLogs = await Lifestyle.find({ userId: user._id }).sort({ date: -1 });

  // Calculate real chronological age
  const ageMs = Date.now() - new Date(user.birthDate).getTime();
  const realAge = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));

  const data = { user, latestSelfie, allSelfies, lifestyleLogs, realAge };
  return JSON.parse(JSON.stringify(data));
}


// ------------------------------
// 4. What-If: Run 2 scenarios side-by-side
// ------------------------------
export async function runWhatIfSim(interventionsA = [], interventionsB = [], labelA = "", labelB = "") {
  const { latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  try {
    if (!latestSelfie) throw new Error("Please take a selfie first to run the AI simulation!");

    const TARGET_YEARS = 1;
    const baseline = latestSelfie.scores;

    const listA = Array.isArray(interventionsA) ? interventionsA : (interventionsA ? [interventionsA] : []);
    const listB = Array.isArray(interventionsB) ? interventionsB : (interventionsB ? [interventionsB] : []);

    // Helper to compute scenario for a given intervention list
    const buildScenario = async (interventions, label) => {
      const proj = projectTrajectory(baseline, TARGET_YEARS, lifestyleLogs, interventions, allSelfies);
      const getIntensity = (base, projected) => {
        const improvement = projected - base;
        if (improvement <= 0) return 0.0;
        return Math.min(1.0, improvement / 15);
      };

      const intensities = {
        wrinkle: getIntensity(baseline.wrinkles, proj.scores.wrinkles),
        age_spot: getIntensity(baseline.spots, proj.scores.spots),
        radiance: getIntensity(baseline.radiance, proj.scores.radiance),
      };
      // Ensure at least minor simulation intensity so YouCam API requirement is satisfied
      if (Object.values(intensities).every(v => v === 0)) {
        intensities.radiance = 0.05;
      }

      // Call the simulation API
      const sim = await simulateSkin(latestSelfie.imageUrl, intensities);

      const extractSimUrl = (sim) => {
        if (sim.output_image_url) return sim.output_image_url;
        if (sim.results?.output_image_url) return sim.results.output_image_url;
        if (Array.isArray(sim.results?.output) && sim.results.output.length > 0) {
          return sim.results.output[0].url;
        }
        return sim.result?.output_image_url || sim.data?.output_image_url || sim.url;
      };

      return {
        label,
        projectedScores: proj.scores,
        skinAgeDelta: proj.skinAgeDelta,
        finalSkinAge: realAge + TARGET_YEARS + proj.skinAgeDelta,
        imageUrl: extractSimUrl(sim),
      };
    };

    const nameA = labelA || (listA.length > 0 ? `With ${listA.join(" + ")}` : "Baseline Routine");
    const nameB = labelB || (listB.length > 0 ? `With ${listB.join(" + ")}` : "Without Routine");

    const scenarioA = await buildScenario(listA, nameA);
    const scenarioB = await buildScenario(listB, nameB);

    // Compute deltas (A - B)
    const deltas = computeDeltas(scenarioA, scenarioB);

    return { success: true, scenarioA, scenarioB, deltas, targetAge: realAge + TARGET_YEARS };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Helper to compute deltas
function computeDeltas(scenarioA, scenarioB) {
  const deltas = {};
  for (const key of Object.keys(scenarioA.projectedScores)) {
    deltas[key] = Math.round((scenarioA.projectedScores[key] - scenarioB.projectedScores[key]) * 10) / 10;
  }
  deltas.skinAge = Math.round((scenarioB.finalSkinAge - scenarioA.finalSkinAge) * 10) / 10;
  return deltas;
}
// ------------------------------
// 5. Onboarding: Save user profile
// ------------------------------

export async function completeOnboarding(data) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect('/sign-in');

    const { birthDate, sex, skinType, goals, customGoal } = data;
    
    await User.findOneAndUpdate(
      { clerkId: clerkUser.id },
      {
        birthDate: new Date(birthDate),
        sex: sex.toLowerCase(), 
        skinType: skinType, 
        goals: goals, 
        customGoal: customGoal || "",
        onboardingComplete: true
      },
      { upsert: true }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}