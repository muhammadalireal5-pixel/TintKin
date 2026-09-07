"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/firebase/admin";
import { connectDb, User, Selfie, Lifestyle, Simulation, RoutineLog } from "./mongoose";
import { analyzeSkin, simulateSkin, extractScoreInfo } from "./youcam";
import { projectTrajectory } from "./predict";
import { generatePersonalizedAdvice, analyzeProductIngredients } from "./qwen";
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
    
    return imageUrl;
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

function applyFaceCropToCloudinary(url){
  if (!url || !url.includes('cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if(parts.length !== 2) return url
  return `${parts[0]}/upload/c_thumb,g_face,z_1.05,w_1200,h_1200/${parts[1]}`;
}

export async function uploadSelfieServerAction(formData) {
  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch (e) {
    return { success: false, error: "Unauthorized" };
  }
  if (!decoded) return { success: false, error: "Unauthorized" };

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
    return { success: false, error: "Upload failed. Please try again later." };
  }
}

async function getDbUser() {
  await connectDb();

  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch (err) {
    redirect("/sign-in");
  }
  if (!decoded) redirect("/sign-in");

  let user = await User.findOne({ firebaseUid: decoded.uid });

  if (!user && decoded.email) {
    const candidates = await User.find({ email: decoded.email });
    if (candidates.length === 1) {
      const candidate = candidates[0];
      if (candidate.firebaseUid && candidate.firebaseUid !== decoded.uid) {
        throw new Error("Firebase identity does not match the existing user");
      }
      if (!candidate.firebaseUid) {
        candidate.firebaseUid = decoded.uid;
        candidate.displayName = decoded.name || candidate.displayName;
        candidate.photoURL = decoded.picture || candidate.photoURL;
        await candidate.save();
        user = candidate;
      }
    }
  }

  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name || "",
      photoURL: decoded.picture || "",
    });
  }

  if (!user.onboardingComplete) {
    redirect("/onboarding");
  }
  return user;
}

export async function checkOnboardingStatus() {
  await connectDb();
  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch (e) {
    return { complete: false };
  }
  if (!decoded) return { complete: false };
  
  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user && decoded.email) {
    user = await User.findOne({ email: decoded.email });
  }
  return { complete: user?.onboardingComplete || false };
}

export async function analyzeAndSaveSelfie(imageUrl, timezone = "UTC") {
  const user = await getDbUser();

  try {
    const todayStart = getLocalDayStart(timezone);
    const uploadsToday = await Selfie.countDocuments({
      userId: user._id, takenAt: { $gte: todayStart }
    });
    if (uploadsToday >= 1) {
      return { success: false, error: "SCAN_LIMIT", message: "You've already logged a photo today. Come back tomorrow to keep your streak going!" };
    }
    if (!imageUrl) throw new Error("No image provided");

    // Update streak logic
    const now = new Date();
    let newStreak = user.currentStreak || 0;
    if (user.lastUploadDate) {
      const lastUpload = new Date(user.lastUploadDate);
      const diffTime = Math.abs(todayStart - getLocalDayStart(timezone, lastUpload));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1; // Streak broken
      }
    } else {
      newStreak = 1;
    }
    
    user.currentStreak = newStreak;
    if (newStreak > (user.longestStreak || 0)) {
      user.longestStreak = newStreak;
    }
    user.lastUploadDate = now;

    // Badge Logic
    const milestones = {
      7: "7-Day Streak",
      30: "1-Month Consistency",
      90: "3-Month Master",
      365: "1-Year Dedication"
    };
    if (milestones[newStreak] && !(user.badges || []).includes(milestones[newStreak])) {
      if (!user.badges) user.badges = [];
      user.badges.push(milestones[newStreak]);
    }

    // Determine if this is an analysis day
    let shouldAnalyze = false;
    let consumeFreeScan = false;
    let consumeExtraScan = false;

    if (user.tier === 'premium' || user.tier === 'standard') {
      const todayStart = getLocalDayStart(timezone);
      const lastAnalyzed = await Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 });

      if (!lastAnalyzed) {
        shouldAnalyze = true;
      } else {
        const diffTime = Math.abs(todayStart - getLocalDayStart(timezone, lastAnalyzed.takenAt));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (user.tier === 'premium' && diffDays >= 1) {
          shouldAnalyze = true;
        } else if (user.tier === 'standard' && diffDays >= 2) {
          shouldAnalyze = true;
        }
      }
    } else {
      // Free or Pending
      if ((user.scanCount || 0) < 2) {
        shouldAnalyze = true;
        consumeFreeScan = true;
      }
    }

    // Check extra scans if not entitled by tier
    if (!shouldAnalyze && user.extraScans > 0) {
      shouldAnalyze = true;
      consumeExtraScan = true;
    }

    // Save user streak and counts before we do the heavy lifting
    await user.save();

    if (!shouldAnalyze) {
      // Streak-only upload
      await Selfie.create({ userId: user._id, imageUrl: imageUrl, isAnalyzed: false });
      return { success: true, isAnalyzed: false, message: "Streak logged! Your next full analysis is coming up soon." };
    }

    const youCamResult = await analyzeSkin(imageUrl);
    
    // Now that analysis succeeded, deduct the quotas
    if (consumeFreeScan) {
      user.scanCount = (user.scanCount || 0) + 1;
      await user.save();
    } else if (consumeExtraScan) {
      user.extraScans -= 1;
      await user.save();
    }

    const data = youCamResult.results || youCamResult.result || youCamResult.task_result || youCamResult;

    const scoreInfo = await extractScoreInfo(data);
    console.log("[Scores] Extracted scoreInfo:", JSON.stringify(scoreInfo, null, 2));

    const readScore = (key, label) => {
      const entry = scoreInfo[key];
      if (!entry) {
        
        return null;
      }
      if (typeof entry === "number") return entry;
      const val = entry.ui_score ?? entry.raw_score ?? entry.score ?? entry.value;
      if (val === undefined || val === null) {
        
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

   

    const overallScore = scoreInfo.all?.score ?? scoreInfo.overall_score ?? null;
    const skinAge = scoreInfo.skin_age ?? scoreInfo.age ?? null;


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
        amRoutine: lastSelfie.amRoutine,
        pmRoutine: lastSelfie.pmRoutine,
        facialWorkout: lastSelfie.facialWorkout,
        products: lastSelfie.recommendedProducts
      };
    } else {
      // Fetch UV index if possible (latitude and longitude from user profile if we added it, or we just pass null for now if we don't have it).
      // Let's assume we can fetch it if we have coordinates, otherwise it will just be null.
      let uvIndex = null;
      if (user.location && user.location.lat && user.location.lng) {
        try {
          const uvRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(user.location.lat)}&longitude=${encodeURIComponent(user.location.lng)}&daily=uv_index_max&timezone=auto`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (uvRes.ok) {
            const uvData = await uvRes.json();
            uvIndex = uvData?.daily?.uv_index_max?.[0] || null;
          }
        } catch(e) {
          console.error("Failed to fetch UV index", e);
        }
      }
      advice = await generatePersonalizedAdvice(user, scores, overallScore, skinAge, uvIndex);
    }

    let recommendedProducts = advice.products || [];
    let habits = advice.habits || [];
    let facialWorkout = advice.facialWorkout || "";
    let critique = advice.critique || "";
    
    let productsChanged = false;
    let habitsChanged = false;
    let workoutChanged = false;

    const recommendationsLocked = user.recommendationsLockedUntil && user.recommendationsLockedUntil > Date.now();
    const workoutLocked = user.workoutLockedUntil && user.workoutLockedUntil > Date.now();

    const updatesToUser = {};

    if (lastSelfie) {
      if (recommendationsLocked) {
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

    if (lastSelfie && lastSelfie.imageUrl) {
      await deleteImageFromCloudinary(lastSelfie.imageUrl);
      await Selfie.updateOne({ _id: lastSelfie._id }, { $set: { imageUrl: null } });
    }

    let amRoutine = advice.amRoutine || [];
    let pmRoutine = advice.pmRoutine || [];

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
      amRoutine: amRoutine,
      pmRoutine: pmRoutine,
      facialWorkout: facialWorkout,
      recommendedProducts,
    });

    await User.findByIdAndUpdate(user._id, { baselineSelfie: imageUrl });

    return { 
      success: true, 
      selfieId: selfie._id.toString(),
      productsChanged,
      habitsChanged,
      workoutChanged
    };
  } catch (err) {
    console.error("[analyzeAndSaveSelfie] Error:", err);
    return { success: false, error: "Analysis failed. Please try a clearer photo or try again later." };
  }
}

function getISOWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
}

export async function getLatestData(timezone = "UTC") {
  const user = await getDbUser();
  const latestSelfie = await Selfie.findOne({ userId: user._id }).sort({ takenAt: -1 });
  const latestAnalyzedSelfie = await Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 }) || latestSelfie;
  const allSelfies = await Selfie.find({ userId: user._id }).sort({ takenAt: 1 });
  const lifestyleLogs = await Lifestyle.find({ userId: user._id }).sort({ date: -1 });

  let realAge = null;
  if (user.birthDate) {
    const birthYear = new Date(user.birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    realAge = currentYear - birthYear;
  }

  let weeklyAverage = null;
  const now = new Date();
  const currentWeekStart = getISOWeekStart(now).getTime();
  const currentWeekEnd = currentWeekStart + 7 * 24 * 60 * 60 * 1000;

  const thisWeekSelfies = allSelfies.filter(s => {
    if (s.isAnalyzed === false) return false;
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

  const todayStart = getLocalDayStart(timezone);
  const todayRoutineLog = await RoutineLog.findOne({
    userId: user._id,
    date: { $gte: todayStart }
  });

  const data = { user, latestSelfie, latestAnalyzedSelfie, allSelfies, lifestyleLogs, realAge, weeklyAverage, todayRoutineLog };
  return JSON.parse(JSON.stringify(data));
}

export async function runWhatIfSim(interventionsA = [], interventionsB = [], labelA = "", labelB = "", timezone = "UTC") {
  const { user, latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  try {
    let allowedMonthly = 0;
    if (user.tier === 'premium') allowedMonthly = 20;
    else if (user.tier === 'standard') allowedMonthly = 4;

    const now = new Date();
    const calendarMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart = user.currentPeriodStart ? new Date(user.currentPeriodStart) : calendarMonthStart;
    const monthStart = periodStart > calendarMonthStart ? periodStart : calendarMonthStart;
    
    const simsThisPeriod = await Simulation.countDocuments({
      userId: user._id, createdAt: { $gte: monthStart }
    });

    if (simsThisPeriod >= allowedMonthly) {
      if (user.extraSimulations > 0) {
        await User.updateOne({ _id: user._id }, { $inc: { extraSimulations: -1 } });
      } else {
        return {
          success: false,
          error: "SIM_LIMIT",
          message: allowedMonthly === 0
            ? "Simulations are available on the Standard and Premium plans. Upgrade to run a simulation."
            : `You've used all ${allowedMonthly} simulations for this billing cycle.`
        };
      }
    }
    if (!latestSelfie) throw new Error("Please take a selfie first to run the AI simulation!");

    const TARGET_YEARS = 1;
    const baseline = latestSelfie.scores;

    const listA = Array.isArray(interventionsA) ? interventionsA : (interventionsA ? [interventionsA] : []);
    const listB = Array.isArray(interventionsB) ? interventionsB : (interventionsB ? [interventionsB] : []);

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

        const sim = await simulateSkin(latestSelfie.imageUrl, intensities);

        const extractSimUrl = (sim) => {
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

    const nameA = labelA || (listA.length > 0 ? `With ${listA.map(p => typeof p === 'object' ? p.type : p).join(" + ")}` : "Baseline Routine");
    const nameB = labelB || (listB.length > 0 ? `With ${listB.map(p => typeof p === 'object' ? p.type : p).join(" + ")}` : "Without Routine");

    const scenarioA = await buildScenario(listA, nameA);
    const scenarioB = await buildScenario(listB, nameB);

    const deltas = computeDeltas(scenarioA, scenarioB);

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
    return { success: false, error: "Simulation failed. Please try again later." };
  }
}

function computeDeltas(scenarioA, scenarioB) {
  const deltas = {};
  for (const key of Object.keys(scenarioA.projectedScores)) {
    deltas[key] = Math.round((scenarioA.projectedScores[key] - scenarioB.projectedScores[key]) * 10) / 10;
  }
  deltas.skinAge = Math.round((scenarioB.finalSkinAge - scenarioA.finalSkinAge) * 10) / 10;
  return deltas;
}

export async function completeOnboarding(data) {
  try {
    await connectDb();
    const decoded = await getAuthenticatedUser();
    if (!decoded) redirect('/sign-in');

    const { birthDate, sex, skinType, goals, customGoal } = data;
    
    await User.findOneAndUpdate(
      { firebaseUid: decoded.uid },
      {
        email: decoded.email || undefined,
        birthDate: new Date(birthDate),
        sex: sex ? sex.toLowerCase() : undefined, 
        skinType: skinType, 
        goals: goals, 
        customGoal: customGoal || "",
        onboardingComplete: true
      },
      { upsert: true }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: "Something went wrong, please try again later" };
  }
}

function getLocalDayStart(timezone, reference = new Date()) {
  const now = reference;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = formatter.format(now).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  const dt = new Date();
  const tzStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  }).format(dt);
  const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'shortOffset' };
  const midnight = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
  midnight.setHours(0,0,0,0);
  const formatter2 = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const formattedDate = formatter2.format(now);
  const [mm, dd, yyyy] = formattedDate.split('/');
  const targetMidnightLocal = new Date(Number(yyyy), Number(mm)-1, Number(dd), 0, 0, 0);
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
  
  const now = new Date();
  const calendarMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = user.currentPeriodStart ? new Date(user.currentPeriodStart) : calendarMonthStart;
  const monthStart = periodStart > calendarMonthStart ? periodStart : calendarMonthStart;

  const scansToday = await Selfie.countDocuments({
    userId: user._id, takenAt: { $gte: todayStart }
  });
  const simsThisPeriod = await Simulation.countDocuments({
    userId: user._id, createdAt: { $gte: monthStart }
  });

  let simLimit = 0;
  if (user.tier === 'premium') simLimit = 20;
  else if (user.tier === 'standard') simLimit = 4;

  return {
    scans: { used: scansToday, limit: 1 },
    simulations: { used: simsThisPeriod, limit: simLimit }
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
    return { success: false, error: "Failed to load simulations." };
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
    console.error("[deleteSavedSimulation] Error:", err);
    return { success: false, error: "Failed to delete simulation." };
  }
}

export async function getWeeklyHistory() {
  const user = await getDbUser();
  const allSelfies = await Selfie.find({ userId: user._id, isAnalyzed: { $ne: false } }).sort({ takenAt: -1 });

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
    .slice(0, 12)
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
export async function analyzeProductImage(base64Image) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const result = await analyzeProductIngredients(base64Image);
    return { success: true, product: result };
  } catch (error) {
    console.error("Failed to analyze product image:", error);
    return { success: false, error: "Failed to analyze product image" };
  }
}

export async function requestUpgrade(tier) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };
    
    if (!['standard', 'premium'].includes(tier)) {
      return { success: false, error: "Invalid tier requested." };
    }
    
    // Record the request. Keep the active tier until an admin approves it.
    user.requestedTier = tier;
    user.upgradeRequestedAt = new Date();
    await user.save();
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to request upgrade." };
  }
}

export async function saveLocation(locationData) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false };
    
    await User.findByIdAndUpdate(user._id, { location: locationData });
    return { success: true, location: locationData };
  } catch (err) {
    return { success: false };
  }
}

export async function getUserProfile() {
  try {
    const user = await getDbUser();
    if (!user) return null;
    return {
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      location: user.location ? {
        city: user.location.city || null,
        lat: user.location.lat || null,
        lng: user.location.lng || null,
      } : null,
      tier: user.tier || "free",
      skinType: user.skinType || null,
      optInComparison: user.optInComparison || false,
    };
  } catch (err) {
    console.error("getUserProfile error:", err);
    return null;
  }
}

export async function updateUserSettings(settings) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const updates = {};
    if (typeof settings.skinType === "string") updates.skinType = settings.skinType;
    if (typeof settings.displayName === "string" && settings.displayName.trim()) {
      updates.displayName = settings.displayName.trim();
    }
    if (typeof settings.optInComparison === "boolean") {
      updates.optInComparison = settings.optInComparison;
    }

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(user._id, updates);
    }
    return { success: true };
  } catch (err) {
    console.error("updateUserSettings error:", err);
    return { success: false, error: "Failed to update settings." };
  }
}

export async function saveRoutineCompletion(time, step, isCompleted, timezone = "UTC") {
  try {
    const user = await getDbUser();
    if (!user) return { success: false };
    
    const todayStart = getLocalDayStart(timezone);
    
    let log = await RoutineLog.findOne({
      userId: user._id,
      date: { $gte: todayStart }
    });
    
    if (!log) {
      log = await RoutineLog.create({
        userId: user._id,
        date: new Date(),
        amCompleted: [],
        pmCompleted: []
      });
    }
    
    const field = time === "am" ? "amCompleted" : "pmCompleted";
    const arr = log[field];
    
    if (isCompleted && !arr.includes(step)) {
      arr.push(step);
    } else if (!isCompleted && arr.includes(step)) {
      const idx = arr.indexOf(step);
      arr.splice(idx, 1);
    }
    
    await log.save();
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}

export async function getPercentileRank() {
  try {
    const user = await getDbUser();
    if (!user || !user.optInComparison) return { success: false };
    
    let age = null;
    if (user.birthDate) {
      age = new Date().getFullYear() - new Date(user.birthDate).getFullYear();
    }
    
    if (!age) return { success: false, error: "Age unknown" };

    const minAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - (age + 5)));
    const maxAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - (age - 5)));

    // Find users in same age bracket (±5 years) and opted in
    const peers = await User.find({
      optInComparison: true,
      birthDate: { $gte: minAgeDate, $lte: maxAgeDate },
      _id: { $ne: user._id }
    });

    if (peers.length < 5) {
      return { success: true, notEnoughData: true };
    }

    const peerIds = peers.map(p => p._id);

    // Get latest score of user
    const userLatest = await Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 });
    if (!userLatest) return { success: false };

    // Get latest scores of peers
    const peerSelfies = await Selfie.aggregate([
      { $match: { userId: { $in: peerIds }, isAnalyzed: true } },
      { $sort: { takenAt: -1 } },
      { $group: { _id: "$userId", latestScore: { $first: "$overallScore" } } }
    ]);

    const peerScores = peerSelfies.map(p => p.latestScore).filter(s => s != null);
    if (peerScores.length === 0) return { success: true, notEnoughData: true };

    const myScore = userLatest.overallScore;
    const lowerOrEqual = peerScores.filter(s => s <= myScore).length;
    
    // Percentile = (number of scores below or equal to yours) / total scores * 100
    const percentile = Math.round((lowerOrEqual / peerScores.length) * 100);

    return { success: true, percentile, peerCount: peerScores.length };
  } catch (err) {
    console.error("Percentile error", err);
    return { success: false };
  }
}

export async function optInComparison(optIn) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false };
    await User.findByIdAndUpdate(user._id, { optInComparison: optIn });
    return { success: true };
  } catch (err) {
    return { success: false };
  }
}
