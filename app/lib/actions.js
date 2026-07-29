"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { User, Selfie, Lifestyle } from "./mongoose";
import { analyzeSkin, ageFace } from "./youcam";
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

    // Helper to extract score regardless of field naming variations
    const getScore = (key1, key2) => {
      const item = data[key1] || data[key2];
      if (typeof item === 'number') return item;
      if (typeof item === 'object' && item !== null && 'score' in item) return item.score;
      return 70;
    };

    const scores = {
      wrinkles: getScore("wrinkles", "wrinkle"),
      firmness: getScore("firmness", "firmness"),
      spots: getScore("spots", "age_spot"),
      radiance: getScore("radiance", "radiance"),
    };
    
    const overallScore = data.overall_score ?? data.score ?? 75;
    const skinAge = data.skin_age ?? 27;

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
      advice = {
        critique: lastSelfie.critique,
        habits: lastSelfie.habits,
        facialWorkout: lastSelfie.facialWorkout,
      };
    } else {
      // Call Qwen to generate personalized advice based on scores and user goals
      advice = await generatePersonalizedAdvice(user, scores, overallScore, skinAge);
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
// 3. Time Machine: Age face + project scores
// ------------------------------
export async function getAgedProjection(years) {
  const { latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  try {
    if (!latestSelfie) throw new Error("Take a selfie first!");

    const targetAge = realAge + years;

    // 1. Predict future scores
    const projection = projectTrajectory(
      latestSelfie.scores,
      years,
      lifestyleLogs,
      [],
      allSelfies
    );

    // 2. Generate aged face via YouCam (intensity = lifestyle multiplier)
    const agedResult = await ageFace(
      latestSelfie.imageUrl,
      targetAge,
      projection.lifestyleMultiplier
    );

    return {
      success: true,
      targetAge,
      realAge,
      currentSkinAge: latestSelfie.skinAge,
      projectedScores: projection.scores,
      skinAgeDelta: projection.skinAgeDelta,
      agedImageUrl: agedResult.result.output_image_url,
      meta: projection.meta,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ------------------------------
// 4. What-If: Run 2 scenarios side-by-side
// ------------------------------
export async function runWhatIfSim(scenarioName) {
  const { latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  try {
    if (!latestSelfie) throw new Error("Take a selfie first!");

    // Simulate to age 50 (common comparison point)
    const TARGET_AGE = 50;
    const totalYears = TARGET_AGE - realAge;
    if (totalYears <= 0) throw new Error("You're already 50+—pick a higher target!");

    let scenarioA, scenarioB;

    // Preset: Retinol @25 vs @35
    if (scenarioName === "retinol") {
      const retinolStartAgeA = 25; // Start NOW
      const retinolStartAgeB = 35; // Start in 10 years

      // Scenario A: Retinol from now
      const yearsWithA = Math.max(0, TARGET_AGE - retinolStartAgeA);
      const yearsWithoutA = totalYears - yearsWithA;
      let projA = projectTrajectory(latestSelfie.scores, yearsWithoutA, lifestyleLogs, [], allSelfies);
      projA = projectTrajectory(projA.scores, yearsWithA, lifestyleLogs, ["retinol"], allSelfies);
      const agedA = await ageFace(latestSelfie.imageUrl, TARGET_AGE, projA.lifestyleMultiplier * 0.9);

      // Scenario B: Retinol at 35
      const yearsWithoutB = Math.max(0, retinolStartAgeB - realAge);
      const yearsWithB = totalYears - yearsWithoutB;
      let projB = projectTrajectory(latestSelfie.scores, yearsWithoutB, lifestyleLogs, [], allSelfies);
      projB = projectTrajectory(projB.scores, yearsWithB, lifestyleLogs, ["retinol"], allSelfies);
      const agedB = await ageFace(latestSelfie.imageUrl, TARGET_AGE, projB.lifestyleMultiplier * 1.1);

      scenarioA = {
        label: "Retinol @ 25",
        projectedScores: projA.scores,
        skinAgeDelta: projA.skinAgeDelta,
        finalSkinAge: TARGET_AGE + projA.skinAgeDelta,
        imageUrl: agedA.result.output_image_url,
      };
      scenarioB = {
        label: "Retinol @ 35",
        projectedScores: projB.scores,
        skinAgeDelta: projB.skinAgeDelta,
        finalSkinAge: TARGET_AGE + projB.skinAgeDelta,
        imageUrl: agedB.result.output_image_url,
      };
    }

    // Calculate deltas (A - B: positive = A is BETTER)
    const deltas = {};
    for (const key of Object.keys(scenarioA.projectedScores)) {
      deltas[key] = Math.round((scenarioA.projectedScores[key] - scenarioB.projectedScores[key]) * 10) / 10;
    }
    deltas.skinAge = Math.round((scenarioB.finalSkinAge - scenarioA.finalSkinAge) * 10) / 10;

    return { success: true, scenarioA, scenarioB, deltas, targetAge: TARGET_AGE };
  } catch (err) {
    return { success: false, error: err.message };
  }
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