"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { User, Selfie, Lifestyle } from "./mongoose";
import { analyzeSkin, ageFace } from "./youcam";
import { projectTrajectory } from "./predict";

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
      birthDate: new Date("2000-01-01"), // Demo: 25yo
      sex: "female",
    });
  }
  return user;
}

// ------------------------------
// 1. Capture: Upload → YouCam → Save to DB
// ------------------------------
export async function analyzeAndSaveSelfie(imageUrl) {
  try {
    const user = await getDbUser();
    if (!imageUrl) throw new Error("No image provided");

    // Call YouCam API (server-only)
    const youCamResult = await analyzeSkin(imageUrl);

    // Extract only the scores we care about
    const scores = {
      wrinkles: youCamResult.result.wrinkles?.score ?? 70,
      firmness: youCamResult.result.firmness?.score ?? 70,
      spots: youCamResult.result.spots?.score ?? 70,
      radiance: youCamResult.result.radiance?.score ?? 70,
    };

    // Save selfie to DB
    const selfie = await Selfie.create({
      userId: user._id,
      imageUrl,
      overallScore: youCamResult.result.overall_score ?? 75,
      skinAge: youCamResult.result.skin_age ?? 27,
      scores,
      maskUrls: youCamResult.result.masks ?? {},
      youCamTaskId: youCamResult.task_id,
    });

    // Update user's baseline selfie
    await User.findByIdAndUpdate(user._id, { baselineSelfie: imageUrl });

    return { success: true, selfieId: selfie._id };
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

  return { user, latestSelfie, allSelfies, lifestyleLogs, realAge };
}

// ------------------------------
// 3. Time Machine: Age face + project scores
// ------------------------------
export async function getAgedProjection(years) {
  try {
    const { latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();
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
  try {
    const { latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();
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