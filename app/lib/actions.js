"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { connectDb, User, Selfie, Lifestyle, Simulation } from "./mongoose";
import { analyzeSkin, simulateSkin, extractScoreInfo } from "./youcam";
import { projectTrajectory } from "./predict";
import { generatePersonalizedAdvice } from "./qwen";
import crypto from "crypto";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = "ml_default";

async function uploadUrlToCloudinary(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;
  
  const form = new FormData();
  form.append("file", imageUrl);
  form.append("upload_preset", UPLOAD_PRESET);
  
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.secure_url;
  } catch (e) {
    console.error("[Cloudinary] Failed to upload simulation image:", e);
    return imageUrl; // Fallback to YouCam URL if upload fails
  }
}

async function deleteImageFromCloudinary(imageUrl) {
  if (!imageUrl || !imageUrl.includes("cloudinary.com")) return;

  try {
    const parts = imageUrl.split("/upload/");
    if (parts.length !== 2) return;
    const pathPart = parts[1];
    const publicIdWithExt = pathPart.substring(pathPart.indexOf("/") + 1);
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf("."));

    const timestamp = Math.floor(Date.now() / 1000);
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", process.env.CLOUDINARY_API_KEY);
    form.append("timestamp", timestamp);
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: form,
    });
    console.log(`[Cloudinary] Deleted ${publicId}:`, await res.text());
  } catch (e) {
    console.error("[Cloudinary] Destroy error:", e);
  }
}

// ------------------------------------------
// Helper: Apply face‑crop to a Cloudinary URL
// ------------------------------------------

function applyFaceCropToCloudinary(url){
  if (!url || !url.includes('cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if(parts.length !== 2) return url
  return `${parts[0]}/upload/c_thumb,g_face,z_1.05,w_1200,h_1200/${parts[1]}`;
}

// ------------------------------
// Helper: Secure Server-Side Upload
// ------------------------------
export async function uploadSelfieServerAction(formData) {
  try {
    const file = formData.get("file");
    if (!file) throw new Error("No file provided");

    const timestamp = Math.floor(Date.now() / 1000);
    const isFlipped = formData.get("flip") === "true";
    
    // Cloudinary requires signature parameters to be sorted alphabetically
    let signatureString = "";
    if (isFlipped) {
      signatureString = `timestamp=${timestamp}&transformation=a_hflip${process.env.CLOUDINARY_API_SECRET}`;
    } else {
      signatureString = `timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    }
    
    const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("api_key", process.env.CLOUDINARY_API_KEY);
    cloudinaryForm.append("timestamp", timestamp);
    cloudinaryForm.append("signature", signature);
    
    if (isFlipped) {
      cloudinaryForm.append("transformation", "a_hflip");
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: cloudinaryForm,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const data = await res.json();
    return { success: true, url: data.secure_url };
  } catch (err) {
    console.error("[Cloudinary] Server upload error:", err);
    return { success: false, error: err.message };
  }
}

// ------------------------------
// Helper: Get/create DB user from Clerk
// ------------------------------
async function getDbUser() {
  await connectDb(); // Ensure DB is connected before querying

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

export async function checkOnboardingStatus() {
  await connectDb();
  const clerkUser = await currentUser();
  if (!clerkUser) return { complete: false };
  const user = await User.findOne({ clerkId: clerkUser.id });
  return { complete: user?.onboardingComplete || false };
}

// ------------------------------
// 1. Capture: Upload → YouCam → Save to DB
// ------------------------------
export async function analyzeAndSaveSelfie(imageUrl, timezone = "UTC") {
  const user = await getDbUser();

  try {
    const todayStart = getLocalDayStart(timezone);
    const scansToday = await Selfie.countDocuments({
      userId: user._id, takenAt: { $gte: todayStart }
    });
    if (scansToday >= 1) {
      return { success: false, error: "SCAN_LIMIT", message: "You've already scanned today. Come back tomorrow!" };
    }
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

    let recommendedProducts = advice.products || [];
    let habits = advice.habits || [];
    let facialWorkout = advice.facialWorkout || "";
    let critique = advice.critique || "";
    
    let productsChanged = false;
    let habitsChanged = false;
    let workoutChanged = false;

    // Recommendations Locking Logic
    const recommendationsLocked = user.recommendationsLockedUntil && user.recommendationsLockedUntil > Date.now();
    const workoutLocked = user.workoutLockedUntil && user.workoutLockedUntil > Date.now();

    const updatesToUser = {};

    if (lastSelfie) {
      if (recommendationsLocked) {
        console.log("[Scores] Products/Habits are locked, keeping previous.");
        if (lastSelfie.recommendedProducts?.length > 0) recommendedProducts = lastSelfie.recommendedProducts;
        if (lastSelfie.habits?.length > 0) habits = lastSelfie.habits;
      } else {
        if (!useCachedAdvice) {
          productsChanged = true;
          habitsChanged = true;
          updatesToUser.recommendationsLockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      }

      if (workoutLocked) {
        console.log("[Scores] Workout is locked, keeping previous.");
        if (lastSelfie.facialWorkout) facialWorkout = lastSelfie.facialWorkout;
      } else {
        if (!useCachedAdvice) {
          workoutChanged = true;
          updatesToUser.workoutLockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
      }
    } else {
      if (!useCachedAdvice) {
        productsChanged = true;
        habitsChanged = true;
        workoutChanged = true;
        updatesToUser.recommendationsLockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        updatesToUser.workoutLockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    if (Object.keys(updatesToUser).length > 0) {
      await User.findByIdAndUpdate(user._id, updatesToUser);
    }

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
      ];
    }

    // Auto-delete the previous selfie image from Cloudinary to save space
    if (lastSelfie && lastSelfie.imageUrl) {
      await deleteImageFromCloudinary(lastSelfie.imageUrl);
      await Selfie.updateOne({ _id: lastSelfie._id }, { $set: { imageUrl: null } });
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
      critique: critique,
      habits: habits,
      facialWorkout: facialWorkout,
      recommendedProducts,
    });

    // Update user's baseline selfie
    await User.findByIdAndUpdate(user._id, { baselineSelfie: imageUrl });

    // Determine what changed for toasts
    // (flags are already computed above based on lock expirations)

    return { 
      success: true, 
      selfieId: selfie._id.toString(),
      productsChanged,
      habitsChanged,
      workoutChanged
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Helper for ISO week start
function getISOWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Convert Sun(0) to 7
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
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

  // Compute weekly average (Mon-Sun)
  let weeklyAverage = null;
  const now = new Date();
  const currentWeekStart = getISOWeekStart(now).getTime();
  const currentWeekEnd = currentWeekStart + 7 * 24 * 60 * 60 * 1000;

  const thisWeekSelfies = allSelfies.filter(s => {
    const t = new Date(s.takenAt).getTime();
    return t >= currentWeekStart && t < currentWeekEnd;
  });

  if (thisWeekSelfies.length > 0) {
    let sumOverall = 0, sumWrinkles = 0, sumFirmness = 0, sumSpots = 0, sumRadiance = 0;
    thisWeekSelfies.forEach(s => {
      sumOverall += s.overallScore || 0;
      sumWrinkles += s.scores?.wrinkles || 0;
      sumFirmness += s.scores?.firmness || 0;
      sumSpots += s.scores?.spots || 0;
      sumRadiance += s.scores?.radiance || 0;
    });
    const count = thisWeekSelfies.length;
    weeklyAverage = {
      scanCount: count,
      overallScore: Math.round(sumOverall / count),
      scores: {
        wrinkles: Math.round(sumWrinkles / count),
        firmness: Math.round(sumFirmness / count),
        spots: Math.round(sumSpots / count),
        radiance: Math.round(sumRadiance / count)
      }
    };
  }

  const data = { user, latestSelfie, allSelfies, lifestyleLogs, realAge, weeklyAverage };
  return JSON.parse(JSON.stringify(data));
}


// ------------------------------
// 4. What-If: Run 2 scenarios side-by-side
// ------------------------------
export async function runWhatIfSim(interventionsA = [], interventionsB = [], labelA = "", labelB = "", timezone = "UTC") {
  const { user, latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  try {
    const weekStart = getLocalISOWeekStart(timezone);
    const simsThisWeek = await Simulation.countDocuments({
      userId: user._id, createdAt: { $gte: weekStart }
    });
    if (simsThisWeek >= 4) {
      return { success: false, error: "SIM_LIMIT", message: "You've used all 4 simulations this week. Resets Monday!" };
    }
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
      // Skip API if there are no interventions (it's the baseline scenario)
      let finalUrl = latestSelfie.imageUrl;
      if (interventions.length === 0 && finalUrl && finalUrl.includes("/upload/")) {
        // Apply the same crop that simulateSkin uses to ensure Slider alignment
        finalUrl = finalUrl.replace("/upload/", "/upload/c_thumb,g_face,z_1.05,w_1200,h_1200/");
      }
      
      if (interventions.length > 0) {
        // Ensure at least minor simulation intensity so YouCam API requirement is satisfied
        if (Object.values(intensities).every(v => v === 0)) {
          intensities.radiance = 0.05;
        }

        // Call the simulation API
        const sim = await simulateSkin(latestSelfie.imageUrl, intensities);

        const extractSimUrl = (sim) => {
          // Primary YouCam simulation result URL
          if (sim.results?.url) return sim.results.url;
          if (sim.output_image_url) return sim.output_image_url;
          if (sim.results?.output_image_url) return sim.results.output_image_url;
          if (Array.isArray(sim.results?.output) && sim.results.output.length > 0) {
            return sim.results.output[0].url;
          }
          if (sim.result?.url) return sim.result.url;
          if (sim.result?.output_image_url) return sim.result.output_image_url;
          if (sim.data?.url) return sim.data.url;
          if (sim.data?.output_image_url) return sim.data.output_image_url;
          if (sim.url) return sim.url;

          // Ultimate fallback to selfie image if simulation url is missing
          return latestSelfie.imageUrl;
        };

        finalUrl = extractSimUrl(sim);

        if (finalUrl && finalUrl !== latestSelfie.imageUrl) {
          finalUrl = await uploadUrlToCloudinary(finalUrl);
        }
      }else{
          finalUrl = applyFaceCropToCloudinary(latestSelfie.imageUrl);
      }
      

      console.log(`[WhatIf] Scenario "${label}" generated Cloudinary URL:`, finalUrl);

      return {
        label,
        projectedScores: proj.scores,
        skinAgeDelta: proj.skinAgeDelta,
        finalSkinAge: realAge + TARGET_YEARS + proj.skinAgeDelta,
        imageUrl: finalUrl,
      };
    };

    const nameA = labelA || (listA.length > 0 ? `With ${listA.join(" + ")}` : "Baseline Routine");
    const nameB = labelB || (listB.length > 0 ? `With ${listB.join(" + ")}` : "Without Routine");

    const scenarioA = await buildScenario(listA, nameA);
    const scenarioB = await buildScenario(listB, nameB);

    // Compute deltas (A - B)
    const deltas = computeDeltas(scenarioA, scenarioB);

    // Save simulation to MongoDB
    const simRecord = await Simulation.create({
      userId: user._id,
      name: `${nameA} vs ${nameB}`,
      scenarioA: { ...scenarioA, products: listA },
      scenarioB: { ...scenarioB, products: listB },
      deltas,
      targetAge: realAge + TARGET_YEARS
    });

    return { 
      success: true, 
      id: simRecord._id.toString(), 
      scenarioA, 
      scenarioB, 
      deltas, 
      targetAge: realAge + TARGET_YEARS 
    };
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

function getLocalDayStart(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = formatter.format(now).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  
  // Create a string that represents midnight in the target timezone
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  
  // Create date considering it's in the target timezone, but Javascript creates it in local time if we aren't careful
  // A robust way in JS without external libraries is getting the UTC time, then adjusting.
  // We can just use the fact that new Date('YYYY-MM-DDThh:mm:ss') parses as local time.
  // Instead, let's format the date to find its offset.
  
  // Simpler approach for server-side Node: Use Intl to format the date in the timezone, find the offset.
  // Actually, in Node, we can just do this to get a UTC date object that corresponds to midnight in that timezone:
  const dt = new Date();
  const tzStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  }).format(dt);
  // This gives "MM/DD/YYYY, HH:mm:ss". We can extract the components and build the midnight UTC.
  // Let's use a simpler string manipulation that works everywhere:
  const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'shortOffset' };
  const str = new Intl.DateTimeFormat('en-US', options).format(dt); // e.g. "08/11/2026, 18:24:36 GMT+05:00"
  // It's just easier to find the offset and apply it.
  
  // The most foolproof way in native JS: 
  // Let `today` be the date string in the local TZ.
  const midnight = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
  midnight.setHours(0,0,0,0);
  
  // Since server might be in a different timezone, we need to calculate the difference
  const serverOffset = new Date().getTimezoneOffset() * 60000;
  
  // We need the UTC time when it was midnight in the target timezone.
  // Let's rely on standard parsing
  const formatter2 = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const formattedDate = formatter2.format(now); // "MM/DD/YYYY"
  const [mm, dd, yyyy] = formattedDate.split('/');
  
  // Create a date in server's local time for that day at midnight
  const targetMidnightLocal = new Date(Number(yyyy), Number(mm)-1, Number(dd), 0, 0, 0);
  
  // Now find the offset of the target timezone at this time
  const targetMidnightStr = targetMidnightLocal.toLocaleString('en-US', {timeZone: timezone});
  // This is too complex.
  
  // The best robust native way:
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  tzDate.setHours(0, 0, 0, 0);
  const diff = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
  return new Date(tzDate.getTime() + diff);
}

function getLocalISOWeekStart(timezone) {
  const todayStart = getLocalDayStart(timezone);
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  const weekdayStr = formatter.format(todayStart); 
  
  const dayOffsets = { "Sun": 6, "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5 };
  const offset = dayOffsets[weekdayStr] || 0;
  
  return new Date(todayStart.getTime() - offset * 24 * 60 * 60 * 1000);
}

export async function getUsageQuotas(timezone = "UTC") {
  const user = await getDbUser();
  const todayStart = getLocalDayStart(timezone);
  const weekStart = getLocalISOWeekStart(timezone);

  const scansToday = await Selfie.countDocuments({
    userId: user._id, takenAt: { $gte: todayStart }
  });
  const simsThisWeek = await Simulation.countDocuments({
    userId: user._id, createdAt: { $gte: weekStart }
  });

  return {
    scans: { used: scansToday, limit: 1 },
    simulations: { used: simsThisWeek, limit: 4 }
  };
}

export async function getSavedSimulations() {
  const user = await getDbUser();
  try {
    const sims = await Simulation.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();
    
    return {
      success: true,
      simulations: sims.map(sim => ({
        ...sim,
        _id: sim._id.toString(),
        userId: sim.userId.toString()
      }))
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteSavedSimulation(simId) {
  const user = await getDbUser();
  try {
    const sim = await Simulation.findOne({ _id: simId, userId: user._id });
    if (!sim) throw new Error("Simulation not found");

    if (sim.scenarioA?.imageUrl) await deleteImageFromCloudinary(sim.scenarioA.imageUrl);
    if (sim.scenarioB?.imageUrl) await deleteImageFromCloudinary(sim.scenarioB.imageUrl);

    await Simulation.deleteOne({ _id: simId });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getWeeklyHistory() {
  const user = await getDbUser();
  const allSelfies = await Selfie.find({ userId: user._id }).sort({ takenAt: -1 });

  const weeksMap = new Map();
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

  allSelfies.forEach(s => {
    const d = new Date(s.takenAt);
    const day = d.getDay() || 7;
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const weekKey = start.getTime();
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, {
        weekLabel: `${formatter.format(start)} (Mon) – ${formatter.format(end)} (Sun)`,
        timestamp: weekKey,
        selfies: []
      });
    }
    weeksMap.get(weekKey).selfies.push(s);
  });

  const history = Array.from(weeksMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12) // Cap at 12 weeks
    .map(week => {
      let sumOverall = 0, sumWrinkles = 0, sumFirmness = 0, sumSpots = 0, sumRadiance = 0;
      week.selfies.forEach(s => {
        sumOverall += s.overallScore || 0;
        sumWrinkles += s.scores?.wrinkles || 0;
        sumFirmness += s.scores?.firmness || 0;
        sumSpots += s.scores?.spots || 0;
        sumRadiance += s.scores?.radiance || 0;
      });
      const count = week.selfies.length;
      return {
        weekLabel: week.weekLabel,
        scanCount: count,
        avgOverall: Math.round(sumOverall / count),
        avgScores: {
          wrinkles: Math.round(sumWrinkles / count),
          firmness: Math.round(sumFirmness / count),
          spots: Math.round(sumSpots / count),
          radiance: Math.round(sumRadiance / count)
        }
      };
    });

  return JSON.parse(JSON.stringify(history));
}