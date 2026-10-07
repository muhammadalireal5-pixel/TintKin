"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedUser, findSessionUser, SESSION_EXPIRED_PATH } from "@/app/lib/auth-server";
import { connectDb, User, Selfie, Lifestyle, Simulation, RoutineLog, Report } from "./mongoose";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "./admin-auth";
import { analyzeSkin, simulateSkin, extractScoreInfo } from "./youcam";
import { projectTrajectory } from "./predict";
import { generatePersonalizedAdvice, analyzeProductIngredients } from "./qwen";
import { evaluateUserAchievements } from "./achievements";
import {
  isOwnedUserUpload,
  getUserUploadPrefix,
  getCloudinaryPublicId,
  applyFaceCropToCloudinary,
  signCloudinaryUrl,
  getCloudinaryDeliveryType,
} from "@/lib/utils/cloudinary";
import { denoiseSelfie } from "@/lib/utils/denoise";
import { checkRateLimit } from "./rate-limit";
import { reserveScanSlot, releaseScanSlot, reserveSimulationSlot, releaseSimulationSlot } from "./quota";
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
import { DEFAULT_RECOMMENDED_PRODUCTS, PRODUCT_TYPES } from "@/lib/constants/products";
import { DENIAL_REASONS, getTierScanLimits, getTierSimLimit } from "@/lib/constants/quotas";
import { SCANS_PER_REPORT, getReportProgress } from "@/lib/constants/reports";
import { sendReportReadyEmail } from "./email";
import { ALLOWED_PHOTO_PRIVACY } from "@/lib/constants/privacy";
import {
  getLocalDayStart,
  getLocalISOWeekStart,
  getLocalMonthStart,
  getISOWeekStart,
  getLocalDayKey,
  getLocalMonthKey,
  normalizeTimezone,
  calculateAge,
} from "@/lib/utils/date";
import { resolvePeriod } from "@/lib/utils/quota-period";
import crypto from "crypto";
import mongoose from "mongoose";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_TIMEOUT_MS = 20000;
// Reservation outcomes that mean "over the limit"; anything else is a failed check.
const QUOTA_LIMIT_REASONS = new Set(["daily_limit", "monthly_limit"]);

const MAX_SIM_INTERVENTIONS = 10;
const MAX_SIM_LABEL_LENGTH = 200;
// Range the product-scan prompt asks Qwen for (app/lib/qwen.js); enforced here
// because interventions arrive from the client.
const MIN_CUSTOM_MULTIPLIER = 0.65;
const MAX_CUSTOM_MULTIPLIER = 0.95;

function clampString(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

// Simulation interventions come from the client and are stored verbatim, so
// keep only known product fields with bounded sizes (valid inputs unchanged).
function sanitizeInterventions(list) {
  const items = Array.isArray(list) ? list : list ? [list] : [];
  return items.slice(0, MAX_SIM_INTERVENTIONS).flatMap((item) => {
    if (typeof item === "string") return item.length <= 40 ? [item] : [];
    if (!item || typeof item !== "object") return [];
    const clean = {
      type: clampString(item.type, 40),
      formula: clampString(item.formula, 200),
      description: clampString(item.description, 500),
    };
    if (item._id != null) clean._id = String(item._id).slice(0, 64);
    if (item.isCustom === true) clean.isCustom = true;
    if (item.isStarter === true) clean.isStarter = true;
    if (Number.isFinite(item.customMultiplier)) {
      clean.customMultiplier = Math.min(MAX_CUSTOM_MULTIPLIER, Math.max(MIN_CUSTOM_MULTIPLIER, item.customMultiplier));
    }
    return [clean];
  });
}

function signCloudinaryParams(params) {
  return crypto.createHash("sha1").update(`${params}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");
}

// Copies a remote (YouCam) result image into our Cloudinary under the user's
// prefix. Uses a server-signed upload rather than the unsigned "ml_default"
// preset, so the app no longer depends on an unsigned preset existing.
async function uploadUrlToCloudinary(imageUrl, userId) {
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${getUserUploadPrefix(userId)}sim-${crypto.randomBytes(12).toString("hex")}`;
  const form = new FormData();
  form.append("file", imageUrl);
  form.append("api_key", process.env.CLOUDINARY_API_KEY);
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("type", "authenticated");
  form.append("signature", signCloudinaryParams(`public_id=${publicId}&timestamp=${timestamp}&type=authenticated`));

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.secure_url;
  } catch (e) {
    // Keep the simulation usable, but the YouCam URL may expire later.
    console.warn(`uploadUrlToCloudinary failed, storing provider URL: ${e?.message || e}`);
    return imageUrl;
  }
}

// Uploads a denoised copy of the selfie for the skin simulation to run on, so
// its changes aren't lost in camera grain. Scans keep using the original, so
// scores stay comparable with earlier scans. Falls back to the original on
// any failure.
async function prepareSimulationSource(imageUrl, userId) {
  if (!imageUrl || !imageUrl.includes("cloudinary.com")) return imageUrl;
  try {
    // Must be signed, not just the signature stripped: an `authenticated`-type
    // asset 401s on any unsigned fetch (see M22 in AUDIT.md). Re-signing a
    // legacy `upload`-type asset is harmless.
    const original = await fetch(signCloudinaryUrl(imageUrl), {
      signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
    });
    if (!original.ok) throw new Error(`fetch HTTP ${original.status}`);
    const cleaned = await denoiseSelfie(Buffer.from(await original.arrayBuffer()));

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${getUserUploadPrefix(userId)}simsrc-${crypto.randomBytes(12).toString("hex")}`;
    const form = new FormData();
    form.append("file", new Blob([cleaned], { type: "image/jpeg" }), "simsrc.jpg");
    form.append("api_key", process.env.CLOUDINARY_API_KEY);
    form.append("public_id", publicId);
    form.append("timestamp", timestamp);
    form.append("type", "authenticated");
    form.append("signature", signCloudinaryParams(`public_id=${publicId}&timestamp=${timestamp}&type=authenticated`));

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
    return (await res.json()).secure_url;
  } catch (e) {
    console.warn(`prepareSimulationSource failed, using original photo: ${e?.message || e}`);
    return imageUrl;
  }
}

async function deleteImageFromCloudinary(imageUrl) {
  const publicId = getCloudinaryPublicId(imageUrl);
  if (!publicId) return;
  // Destroy must target the asset's actual delivery type (see M22 in
  // AUDIT.md) — a type mismatch doesn't error, it just silently destroys
  // nothing, orphaning the real asset.
  const deliveryType = getCloudinaryDeliveryType(imageUrl) || "upload";

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // invalidate=true also purges CDN-cached copies of the deleted image.
    const signature = signCloudinaryParams(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}&type=${deliveryType}`);

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("invalidate", "true");
    form.append("api_key", process.env.CLOUDINARY_API_KEY);
    form.append("timestamp", timestamp);
    form.append("type", deliveryType);
    form.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`Cloudinary destroy failed (HTTP ${res.status})`);
  } catch (e) {
    // Non-blocking cleanup
    console.warn(`Cloudinary destroy failed: ${e?.message || e}`);
  }
}

// The Selfie schema requires recommendedProducts to be empty or exactly 3 valid
// items. The AI advice call doesn't always honor that shape (missing fields,
// wrong count, an off-enum type string), which previously threw a Mongoose
// ValidationError and silently discarded the entire scan. Sanitize to the
// schema's contract, falling back to the curated defaults when the AI output
// doesn't qualify.
function sanitizeRecommendedProducts(products) {
  if (!Array.isArray(products)) return DEFAULT_RECOMMENDED_PRODUCTS;

  const valid = products.filter(
    (p) =>
      p &&
      typeof p === "object" &&
      PRODUCT_TYPES.includes(p.type) &&
      typeof p.formula === "string" &&
      p.formula.trim().length > 0 &&
      typeof p.description === "string" &&
      p.description.trim().length > 0
  );

  return valid.length === 3 ? valid : DEFAULT_RECOMMENDED_PRODUCTS;
}

export async function uploadSelfieServerAction(formData) {
  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch (e) {
    return { success: false, error: "Unauthorized" };
  }
  if (!decoded) return { success: false, error: "Unauthorized" };

  const rateCheck = await checkRateLimit(decoded.uid, "upload", 5, 60000);
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
    // Explicit public_id (not `folder`) so the owner prefix ends up in the URL
    // under both fixed- and dynamic-folder Cloudinary modes.
    const publicId = `${getUserUploadPrefix(decoded.uid)}${crypto.randomBytes(12).toString("hex")}`;

    // Cloudinary requires signature parameters to be sorted alphabetically.
    // type=authenticated (not the default "upload") makes the asset require a
    // valid signature to be served at all — see M22 in AUDIT.md.
    const signedParams = `public_id=${publicId}&timestamp=${timestamp}${isFlipped ? "&transformation=a_hflip" : ""}&type=authenticated`;
    const signature = crypto.createHash("sha1").update(`${signedParams}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("api_key", process.env.CLOUDINARY_API_KEY);
    cloudinaryForm.append("public_id", publicId);
    cloudinaryForm.append("timestamp", timestamp);
    cloudinaryForm.append("type", "authenticated");
    cloudinaryForm.append("signature", signature);

    if (isFlipped) {
      cloudinaryForm.append("transformation", "a_hflip");
    }

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: cloudinaryForm,
      signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
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
  const [, auth] = await Promise.all([
    connectDb(),
    getAuthenticatedUser().then(
      (decoded) => ({ decoded }),
      () => ({ decoded: null })
    ),
  ]);
  const decoded = auth.decoded;
  if (!decoded) redirect("/sign-in");

  const user = await findSessionUser(decoded);

  // Both sign-in providers create the DB user before issuing a session, so a
  // missing user means the account was deleted or the session revoked. Never
  // recreate it from the token (that resurrected deleted accounts).
  if (!user) redirect(SESSION_EXPIRED_PATH);

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
  
  const user = await findSessionUser(decoded);
  return { complete: user?.onboardingComplete || false };
}

export async function analyzeAndSaveSelfie(imageUrl, timezone = "UTC") {
  timezone = normalizeTimezone(timezone);
  const user = await getDbUser();

  const rateCheck = await checkRateLimit(user._id.toString(), "analyze", 3, 60000);
  if (!rateCheck.allowed) {
    return errorResult(
      ERROR_CODES.RATE_LIMIT || "RATE_LIMIT",
      `Too many scan requests. Please wait ${rateCheck.retryAfter}s before scanning again.`,
      { error: "RATE_LIMIT" }
    );
  }

  let extraScanConsumed = false;
  let reservedScanSlot = null;
  let selfieCreated = false;
  try {
    if (!user.termsAcceptedAt) {
      return errorResult(ERROR_CODES.VALIDATION_ERROR, "Please accept the terms and choose your photo privacy option first.", { error: "CONSENT_REQUIRED" });
    }
    if (!imageUrl || !isOwnedUserUpload(imageUrl, user._id.toString())) {
      return errorResult(ERROR_CODES.VALIDATION_ERROR, "Invalid or untrusted image URL.", { error: "Invalid or untrusted image URL." });
    }

    const { daysInMonth } = getLocalMonthStart(timezone);
    const { dailyLimit: scanDailyLimit, monthlyLimit: scanMonthlyLimit } = getTierScanLimits(user.tier, daysInMonth);

    // "Every-other-day" is a soft pacing nudge for Standard plans, not a hard
    // cost boundary (the daily cap below already limits scans to 1/day), so
    // an eventually-consistent read here is fine.
    const pacingTodayStart = getLocalDayStart(timezone);
    const pacingYesterdayStart = new Date(pacingTodayStart);
    pacingYesterdayStart.setDate(pacingYesterdayStart.getDate() - 1);
    const pacingBlocked =
      user.tier === TIERS.STANDARD &&
      user.standardPlanFrequency === STANDARD_PACING.EVERY_OTHER_DAY &&
      (await Selfie.countDocuments({ userId: user._id, takenAt: { $gte: pacingYesterdayStart, $lt: pacingTodayStart } })) > 0;

    let scanDenialReason = "";
    if (pacingBlocked) {
      scanDenialReason = DENIAL_REASONS.EVERY_OTHER_DAY;
    } else {
      // Atomically reserves the slot before the expensive AI calls below so
      // concurrent requests can't both pass a stale check (see app/lib/quota.js).
      const reservation = await reserveScanSlot(user._id, timezone, scanDailyLimit, scanMonthlyLimit);
      if (reservation.granted) {
        reservedScanSlot = { dayKey: reservation.dayKey, monthKey: reservation.monthKey };
      } else if (!QUOTA_LIMIT_REASONS.has(reservation.reason)) {
        // The check itself failed (DB/transaction error), not the user's limit:
        // don't silently spend their purchased extra scans on it.
        return errorResult(ERROR_CODES.SCAN_LIMIT, "We couldn't verify your scan allowance right now. Please try again in a moment.", { error: "QUOTA_CHECK_FAILED" });
      } else {
        scanDenialReason = reservation.reason === "daily_limit" ? DENIAL_REASONS.DAILY_LIMIT : DENIAL_REASONS.MONTHLY_LIMIT;
      }
    }

    if (!reservedScanSlot) {
      const consumed = await User.findOneAndUpdate(
        { _id: user._id, extraScans: { $gt: 0 } },
        { $inc: { extraScans: -1 } }
      );
      if (!consumed) {
        let msg = "You've reached your scan limit.";
        if (scanDenialReason === DENIAL_REASONS.DAILY_LIMIT) msg = "You've already logged a photo today. We will await your arrival tomorrow to keep your streak going!";
        if (scanDenialReason === DENIAL_REASONS.MONTHLY_LIMIT) msg = "You've used all your scans for this month. We will await your arrival next billing cycle!";
        if (scanDenialReason === DENIAL_REASONS.EVERY_OTHER_DAY) msg = "Your plan is set to every-other-day. We will await your arrival tomorrow!";
        return errorResult(ERROR_CODES.SCAN_LIMIT, msg, { error: "SCAN_LIMIT" });
      }
      extraScanConsumed = true;
    }

    const now = new Date();
    let newStreak = user.currentStreak || 0;
    if (user.lastUploadDate) {
      // Calendar-day difference via day-KEY strings ("YYYY-MM-DD" interpreted
      // as UTC midnight), not elapsed wall-clock time: a DST transition makes
      // one local day 23 or 25 hours long, which dividing by a fixed 24h unit
      // (the old `Math.ceil(diffTime / 86400000)`) miscounted as a 2-day gap
      // and incorrectly reset the streak (M16 in AUDIT.md).
      const todayKey = getLocalDayKey(timezone, now);
      const lastUploadKey = getLocalDayKey(timezone, user.lastUploadDate);
      const diffDays = Math.round((Date.parse(todayKey) - Date.parse(lastUploadKey)) / 86400000);
      // An every-other-day Standard plan's expected cadence IS a 2-day gap;
      // counting only a 1-day gap as "kept up" meant that plan's streak could
      // never exceed 1 (M16 in AUDIT.md).
      const isEveryOtherDay = user.tier === TIERS.STANDARD && user.standardPlanFrequency === STANDARD_PACING.EVERY_OTHER_DAY;
      const allowedGapDays = isEveryOtherDay ? 2 : 1;
      if (diffDays >= 1 && diffDays <= allowedGapDays) {
        newStreak += 1;
      } else if (diffDays > allowedGapDays) {
        newStreak = 1; // Streak broken
      }
    } else {
      newStreak = 1;
    }
    
    // Badge logic: collect only the *new* ids so the user update below can
    // $addToSet them instead of overwriting the whole array. Two near-
    // simultaneous scans both computing this from the same stale `user.badges`
    // snapshot is exactly the race that used to silently drop a badge one of
    // them earned (M15 in AUDIT.md) when the write was a plain $set.
    const existingBadges = user.badges || [];
    const newBadges = [];
    const addBadge = (id) => {
      if (!existingBadges.includes(id) && !newBadges.includes(id)) newBadges.push(id);
    };
    addBadge("first_glow");
    if (newStreak >= 7) addBadge("week_radiance");
    if (newStreak >= 30) addBadge("consistency_champion");

    // YouCam fetches this URL from its own servers, so an `authenticated`-type
    // asset (see M22 in AUDIT.md) must be signed first, or every candidate
    // download 401s. Signing an already-public `upload`-type asset is a no-op.
    const youCamResult = await analyzeSkin(signCloudinaryUrl(imageUrl));

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

    let recommendedProducts = adviceSucceeded && Array.isArray(advice.products) ? sanitizeRecommendedProducts(advice.products) : [];
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
      const realAge = calculateAge(user.birthDate);
      if (realAge != null && skinAge < realAge) {
        addBadge("youth_catalyst");
      }
    }

    let finalImageUrl = imageUrl;
    if (user.photoPrivacy === 'delete') {
      await deleteImageFromCloudinary(imageUrl).catch(() => {});
      finalImageUrl = null;
    }

    // Create the new record, then update the user, then clean up the old
    // image — in that order, so a failure partway through never leaves the
    // user further along (a badge, an advanced streak) than an actual saved
    // scan justifies, and never deletes the old photo before the new scan's
    // own record is safely committed (M15 in AUDIT.md).
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
    selfieCreated = true;

    const userUpdateOps = {
      $set: {
        ...updatesToUser,
        currentStreak: newStreak,
        longestStreak: newStreak > (user.longestStreak || 0) ? newStreak : user.longestStreak,
        lastUploadDate: now,
        baselineSelfie: finalImageUrl,
      },
      $inc: { scanCount: 1 },
    };
    if (newBadges.length > 0) {
      userUpdateOps.$addToSet = { badges: { $each: newBadges } };
    }
    await User.findByIdAndUpdate(user._id, userUpdateOps);

    if (lastSelfie && lastSelfie.imageUrl) {
      await deleteImageFromCloudinary(lastSelfie.imageUrl);
      await Selfie.updateOne({ _id: lastSelfie._id }, { $set: { imageUrl: null } });
    }

    const report = await notifyReportReadyIfDue(user);

    if (adviceSucceeded) {
      return okResult({
        selfieId: selfie._id.toString(),
        adviceStatus: STATUS.OK,
        productsChanged,
        habitsChanged,
        workoutChanged,
        reportReady: report.ready,
        reportJustUnlocked: report.justUnlocked,
      });
    }

    return partialResult({
      selfieId: selfie._id.toString(),
      adviceStatus: STATUS.ERROR,
      productsChanged: false,
      habitsChanged: false,
      workoutChanged: false,
      reportReady: report.ready,
      reportJustUnlocked: report.justUnlocked,
    },  ERROR_CODES.AI_ADVICE_UNAVAILABLE, "Biomarker scores captured successfully! AI personalized advice is temporarily unavailable and will refresh on your next scan.");
  } catch (err) {
    if (extraScanConsumed) {
      await User.findByIdAndUpdate(user._id, { $inc: { extraScans: 1 } }).catch(() => {});
    }
    if (reservedScanSlot) {
      await releaseScanSlot(user._id, reservedScanSlot.dayKey, reservedScanSlot.monthKey);
    }
    // Only roll back the upload if no Selfie record ended up referencing it —
    // otherwise a later failure (e.g. the user/badge update) would delete the
    // image out from under an already-saved scan (M15 in AUDIT.md).
    if (imageUrl && !selfieCreated) {
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


const SELFIE_LIST_FIELDS = "takenAt isAnalyzed overallScore skinAge scores";
const MAX_SELFIE_PAGE_SIZE = 100;
// Safety caps for the "full history" fetch (no selfieLimit given): years of
// daily use would otherwise load an ever-growing, unprojected result set.
// Both are far above what the trend/lifestyle math below actually weighs
// (see predict.js), so real users never notice the cap.
const MAX_SELFIE_HISTORY = 1000;
const MAX_LIFESTYLE_HISTORY = 400;

const clampPageSize = (value) =>
  Number.isInteger(value) ? Math.min(Math.max(value, 1), MAX_SELFIE_PAGE_SIZE) : null;

// `user.currentStreak` is only recomputed when a new scan lands, so a user
// who stops scanning keeps seeing their old streak forever (M16 in
// AUDIT.md). This derives what the streak would be shown as *right now*,
// without writing anything back — analyzeAndSaveSelfie's own gap logic is
// the one source of truth for the stored value.
function computeDisplayStreak(user, timezone) {
  const stored = user.currentStreak || 0;
  if (!stored || !user.lastUploadDate) return stored;

  const todayKey = getLocalDayKey(timezone, new Date());
  const lastUploadKey = getLocalDayKey(timezone, user.lastUploadDate);
  const diffDays = Math.round((Date.parse(todayKey) - Date.parse(lastUploadKey)) / 86400000);
  const isEveryOtherDay = user.tier === TIERS.STANDARD && user.standardPlanFrequency === STANDARD_PACING.EVERY_OTHER_DAY;
  const allowedGapDays = isEveryOtherDay ? 2 : 1;
  return diffDays > allowedGapDays ? 0 : stored;
}

// `allSelfies` is always the newest `options.selfieLimit` (or MAX_SELFIE_HISTORY
// when omitted) selfies, list fields only, oldest-first; `lifestyleLogs` is
// capped the same way and skipped entirely when selfieLimit is set. Scan count
// and first-scan values depend on the full history, so they're always read via
// separate exact queries (totalSelfieCount/firstSelfie) rather than derived from
// the capped array.
export async function getLatestData(timezone = "UTC", options = {}) {
  timezone = normalizeTimezone(timezone);
  const user = await getDbUser();
  // Display-only: never persisted, so the stored streak is untouched until
  // the user's next scan recomputes it for real.
  user.currentStreak = computeDisplayStreak(user, timezone);
  const selfieLimit = clampPageSize(options?.selfieLimit);

  const now = new Date();
  const currentWeekStart = getISOWeekStart(now).getTime();
  const currentWeekEnd = currentWeekStart + 7 * 24 * 60 * 60 * 1000;
  const todayStart = getLocalDayStart(timezone);

  const [
    latestSelfie,
    latestAnalyzedSelfie,
    selfieRows,
    lifestyleLogs,
    todayRoutineLog,
    simCount,
    totalSelfieCount,
    firstSelfie,
    weekRowsIfLimited,
  ] = await Promise.all([
    Selfie.findOne({ userId: user._id }).sort({ takenAt: -1 }),
    Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 }),
    Selfie.find({ userId: user._id })
      .select(SELFIE_LIST_FIELDS)
      .sort({ takenAt: -1 })
      .limit(selfieLimit || MAX_SELFIE_HISTORY)
      .lean(),
    selfieLimit
      ? Promise.resolve([])
      : Lifestyle.find({ userId: user._id }).sort({ date: -1 }).limit(MAX_LIFESTYLE_HISTORY).lean(),
    RoutineLog.findOne({
      userId: user._id,
      date: { $gte: todayStart }
    }),
    Simulation.countDocuments({ userId: user._id }),
    // Exact regardless of the cap above, so achievements/scan-count stay
    // correct even for a history longer than MAX_SELFIE_HISTORY.
    Selfie.countDocuments({ userId: user._id }),
    Selfie.findOne({ userId: user._id }).select("skinAge").sort({ takenAt: 1 }).lean(),
    selfieLimit
      ? Selfie.find({
          userId: user._id,
          takenAt: { $gte: new Date(currentWeekStart), $lt: new Date(currentWeekEnd) },
        }).select(SELFIE_LIST_FIELDS).lean()
      : null,
  ]);

  const allSelfies = selfieRows.reverse();
  const weekRows = selfieLimit ? weekRowsIfLimited : null;

  const realAge = user.birthDate ? calculateAge(user.birthDate) : null;

  let weeklyAverage = null;

  const thisWeekSelfies = (selfieLimit ? weekRows : allSelfies).filter(s => {
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

  const { evaluatedAchievements, unlockedCount, totalCount, newlyUnlockedIds } = evaluateUserAchievements({
    user,
    allSelfies,
    simulationCount: simCount,
    todayRoutineLog,
    amRoutine: latestAnalyzedSelfie?.amRoutine,
    pmRoutine: latestAnalyzedSelfie?.pmRoutine,
    realAge,
    selfieCount: totalSelfieCount,
    firstSelfie,
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
  // allSelfies is always the SELFIE_LIST_FIELDS projection (no imageUrl);
  // only latestSelfie/latestAnalyzedSelfie carry a signable image.

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
    achievementStats: { unlockedCount, totalCount },
    ...(selfieLimit ? { hasMoreSelfies: totalSelfieCount > allSelfies.length } : {}),
  };
  return JSON.parse(JSON.stringify(data));
}

export async function getOlderSelfies(beforeTakenAt, pageSize = 20) {
  const user = await getDbUser();
  const before = new Date(beforeTakenAt);
  const limit = clampPageSize(pageSize) || 20;
  if (Number.isNaN(before.getTime())) {
    return { success: false, selfies: [], hasMore: false };
  }

  const rows = await Selfie.find({ userId: user._id, takenAt: { $lt: before } })
    .select(SELFIE_LIST_FIELDS)
    .sort({ takenAt: -1 })
    .limit(limit + 1)
    .lean();

  return JSON.parse(JSON.stringify({
    success: true,
    selfies: rows.slice(0, limit).reverse(),
    hasMore: rows.length > limit,
  }));
}

export async function runWhatIfSim(interventionsA = [], interventionsB = [], labelA = "", labelB = "", timezone = "UTC", customImageUrl = null) {
  timezone = normalizeTimezone(timezone);
  const { user, latestSelfie, allSelfies, lifestyleLogs, realAge } = await getLatestData();

  const rateCheck = await checkRateLimit(user._id.toString(), "simulate", 5, 60000);
  if (!rateCheck.allowed) {
    return errorResult(
      ERROR_CODES.RATE_LIMIT || "RATE_LIMIT",
      `Too many simulation requests. Please wait ${rateCheck.retryAfter}s before running another simulation.`,
      { error: "RATE_LIMIT" }
    );
  }

  const sourceImageUrl = customImageUrl || latestSelfie?.imageUrl;
  if (customImageUrl && !isOwnedUserUpload(customImageUrl, user._id.toString())) {
    return errorResult(ERROR_CODES.VALIDATION_ERROR, "Invalid or untrusted image URL.", { error: "Invalid or untrusted image URL." });
  }

  let extraSimConsumed = false;
  let reservedSimSlot = null;
  let simSourceUrl = null;
  try {
    const simLimit = getTierSimLimit(user.tier);
    // Atomically reserves the slot before the expensive AI calls below so
    // concurrent requests can't both pass a stale check (see app/lib/quota.js).
    const reservation = await reserveSimulationSlot(user._id, timezone, simLimit);
    if (reservation.granted) {
      reservedSimSlot = { monthKey: reservation.monthKey };
    } else if (!QUOTA_LIMIT_REASONS.has(reservation.reason)) {
      // The check itself failed, not the user's limit: keep their extras.
      return errorResult(ERROR_CODES.SIM_LIMIT, "We couldn't verify your simulation allowance right now. Please try again in a moment.", { error: "QUOTA_CHECK_FAILED" });
    } else {
      const consumed = await User.findOneAndUpdate(
        { _id: user._id, extraSimulations: { $gt: 0 } },
        { $inc: { extraSimulations: -1 } }
      );
      if (!consumed) {
        return errorResult(
          ERROR_CODES.SIM_LIMIT,
          simLimit === 1 && user.tier === 'free'
            ? "You've used your 1 free simulation for this month. Upgrade to Standard or Pro for more!"
            : `You've used all ${simLimit} simulations for this month.`,
          { error: "SIM_LIMIT" }
        );
      }
      extraSimConsumed = true;
    }

    const rollbackSimQuota = async () => {
      if (extraSimConsumed) {
        await User.findByIdAndUpdate(user._id, { $inc: { extraSimulations: 1 } }).catch(() => {});
      }
      if (reservedSimSlot) {
        await releaseSimulationSlot(user._id, reservedSimSlot.monthKey);
      }
    };

    if (!latestSelfie?.scores || typeof latestSelfie.scores.wrinkles !== "number") {
      await rollbackSimQuota();
      return errorResult(
        ERROR_CODES.NO_BASELINE,
        "Please complete a baseline skin analysis scan before running What-If simulations.",
        { error: "NO_BASELINE" }
      );
    }

    if (!sourceImageUrl) {
      await rollbackSimQuota();
      return errorResult(
        ERROR_CODES.NO_BASELINE,
        "No photo available to run the AI simulation on!",
        { error: "No photo available to run the AI simulation on!" }
      );
    }

    simSourceUrl = await prepareSimulationSource(sourceImageUrl, user._id.toString());

    const TARGET_YEARS = 1;
    const baseline = latestSelfie.scores;

    const listA = sanitizeInterventions(interventionsA);
    const listB = sanitizeInterventions(interventionsB);
    labelA = typeof labelA === "string" ? labelA.slice(0, MAX_SIM_LABEL_LENGTH) : "";
    labelB = typeof labelB === "string" ? labelB.slice(0, MAX_SIM_LABEL_LENGTH) : "";

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
      
      let finalUrl = simSourceUrl;
      if (interventions.length === 0 && finalUrl) {
        // Apply the same crop that simulateSkin uses to ensure Slider alignment
        finalUrl = applyFaceCropToCloudinary(finalUrl);
      }
      
      if (interventions.length > 0) {
        // Ensure at least minor simulation intensity so YouCam API requirement is satisfied
        if (Object.values(intensities).every(v => v === 0)) {
          intensities.radiance = 0.05;
        }

        // simSourceUrl is Cloudinary's raw (unsigned) upload response; YouCam
        // fetches it directly, so an `authenticated`-type asset needs it
        // signed first (see M22 in AUDIT.md).
        const sim = await simulateSkin(signCloudinaryUrl(simSourceUrl), intensities);

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

        if (finalUrl && finalUrl !== simSourceUrl) {
          finalUrl = await uploadUrlToCloudinary(finalUrl, user._id.toString());
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

    // The cleaned copy is kept only while a scenario shows it (a no-routine
    // baseline); account and privacy deletion find it through that URL.
    if (simSourceUrl !== sourceImageUrl) {
      const cleanId = getCloudinaryPublicId(simSourceUrl);
      const referenced = [scenarioA, scenarioB].some((s) => getCloudinaryPublicId(s.imageUrl) === cleanId);
      if (!referenced) await deleteImageFromCloudinary(simSourceUrl).catch(() => {});
    }

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
    console.error(`runWhatIfSim failed for user ${user._id}: ${err?.message || err}`);
    if (simSourceUrl && simSourceUrl !== sourceImageUrl) {
      await deleteImageFromCloudinary(simSourceUrl).catch(() => {});
    }
    if (extraSimConsumed) {
      await User.findByIdAndUpdate(user._id, { $inc: { extraSimulations: 1 } }).catch(() => {});
    }
    if (reservedSimSlot) {
      await releaseSimulationSlot(user._id, reservedSimSlot.monthKey).catch(() => {});
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
    
    const user = await findSessionUser(decoded);
    if (!user) return { success: false, error: "User not found" };

    if (!simId || !mongoose.Types.ObjectId.isValid(simId)) {
      return { success: false, error: "Invalid simulation ID" };
    }

    const sim = await Simulation.findOne({ _id: simId, userId: user._id });
    if (!sim) return { success: false, error: "Simulation not found" };

    // The photo-keep decision is a one-time, one-way choice. Re-opening an
    // already-decided simulation from history and hitting "Save" again must
    // never re-run the deletion branch — that silently destroyed photos the
    // user had already chosen to keep, because the client re-defaults
    // `keepPhoto` to unchecked every time a saved sim is reopened.
    if (sim.confirmed) {
      return { success: true, sim: JSON.parse(JSON.stringify({ ...sim.toObject(), id: sim._id.toString() })) };
    }

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
    }

    sim.confirmed = true;
    await sim.save();

    // Server actions can only return plain data: a live Mongoose document
    // made the call reject on the client after the write had already happened.
    return { success: true, sim: JSON.parse(JSON.stringify({ ...sim.toObject(), id: sim._id.toString() })) };
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
    
    const targetUser = await findSessionUser(decoded);

    const updateFields = {
      email: decoded.email ? decoded.email.toLowerCase().trim() : undefined,
      birthDate: parsedDate,
      sex: normalizedSex, 
      skinType: normalizedSkinType, 
      goals: validGoals, 
      customGoal: cleanCustomGoal,
      onboardingComplete: true
    };

    if (!targetUser) {
      return { success: false, error: "Your session has ended. Please sign in again." };
    }
    await User.findByIdAndUpdate(targetUser._id, updateFields);

    return { success: true };
  } catch (err) {
    return { success: false, error: "Something went wrong, please try again later" };
  }
}

/**
 * Whether the one-time "accept terms + choose photo storage" prompt still
 * needs to be shown, checked right before the capture flow opens the
 * camera/gallery picker (not at sign-up — no photo has been collected yet).
 */
export async function getScanConsentStatus() {
  try {
    const user = await getDbUser();
    return { needsConsent: !user.termsAcceptedAt };
  } catch {
    return { needsConsent: false };
  }
}

/**
 * Records terms acceptance (once, for audit purposes) and the user's photo
 * storage choice, before their first scan ever uploads a photo.
 */
export async function acceptScanConsent(photoPrivacy) {
  try {
    const user = await getDbUser();
    if (!ALLOWED_PHOTO_PRIVACY.includes(photoPrivacy)) {
      return { success: false, error: "Invalid photo privacy option" };
    }
    const update = { photoPrivacy };
    if (!user.termsAcceptedAt) update.termsAcceptedAt = new Date();
    await User.findByIdAndUpdate(user._id, update);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save your choice. Please try again." };
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

    const user = await findSessionUser(decoded);
    if (!user) return { success: false, error: "User not found" };

    const switchingToDelete = photoPrivacy === "delete" && user.photoPrivacy !== "delete";

    user.photoPrivacy = photoPrivacy;
    await user.save();

    // Switching into "delete immediately" also wipes whatever photo was kept
    // under the previous "store" setting — the user is told this happens
    // before confirming (ScanConsentModal/SettingsModal), so it must actually
    // happen here, not just flip the flag going forward.
    if (switchingToDelete) {
      const storedSelfies = await Selfie.find({ userId: user._id, imageUrl: { $ne: null } }).select("imageUrl");
      await Promise.allSettled(storedSelfies.map((s) => deleteImageFromCloudinary(s.imageUrl)));
      if (storedSelfies.length > 0) {
        await Selfie.updateMany({ userId: user._id, imageUrl: { $ne: null } }, { $set: { imageUrl: null } });
      }
      if (user.baselineSelfie) {
        await deleteImageFromCloudinary(user.baselineSelfie).catch(() => {});
        await User.findByIdAndUpdate(user._id, { $set: { baselineSelfie: null } });
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Failed to update settings" };
  }
}

export async function getUsageQuotas(timezone = "UTC") {
  timezone = normalizeTimezone(timezone);
  const user = await getDbUser();
  const todayStart = getLocalDayStart(timezone);
  const { daysInMonth } = getLocalMonthStart(timezone);

  // Read the same counters reserveScanSlot/reserveSimulationSlot enforce
  // against (app/lib/quota.js), not a fresh countDocuments(): those drifted
  // from the enforced count whenever a scan/sim was deleted afterward (M14 in
  // AUDIT.md), since deleting a document never decrements the counter.
  const scanUsage = user.scanUsage || {};
  const simUsage = user.simUsage || {};
  const dayKey = getLocalDayKey(timezone);
  const monthKey = getLocalMonthKey(timezone);

  const scansToday = resolvePeriod(scanUsage.dayKey, scanUsage.dayCount, dayKey).count;
  const scansThisMonth = resolvePeriod(scanUsage.monthKey, scanUsage.monthCount, monthKey).count;
  const simsThisMonth = resolvePeriod(simUsage.monthKey, simUsage.monthCount, monthKey).count;

  const { dailyLimit: scanDailyLimit, monthlyLimit: scanMonthlyLimit } = getTierScanLimits(user.tier, daysInMonth);
  const simLimit = getTierSimLimit(user.tier);

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
    // Only the most recent 12 weeks are ever displayed (see .slice(0, 12)
    // below), but this used to load the user's entire scan history —
    // unbounded, unprojected and non-lean — to compute it every time (M19 in
    // AUDIT.md). 100 days covers 12+ calendar weeks with room for week-
    // boundary edge effects.
    const since = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const allSelfies = await Selfie.find({ userId: user._id, isAnalyzed: { $ne: false }, takenAt: { $gte: since } })
      .select("takenAt overallScore scores")
      .sort({ takenAt: -1 })
      .lean();

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

    const rateCheck = await checkRateLimit(authUser.uid, "product_ocr", 3, 60000);
    if (!rateCheck.allowed) {
      return { success: false, error: `Too many scan attempts. Please wait ${rateCheck.retryAfter}s before scanning another product.` };
    }

    const result = await analyzeProductIngredients(base64Image);

    await connectDb();
    await User.findByIdAndUpdate(
      authUser.uid,
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
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`,
          { signal: AbortSignal.timeout(5000) }
        );
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
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, {
          signal: AbortSignal.timeout(5000),
        });
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
      emailVerified: Boolean(user.emailVerified),
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

    const delta = Number(amount);
    if (!Number.isInteger(delta) || Math.abs(delta) > 1000) {
      return { success: false, error: "Invalid amount" };
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $inc: { extraScans: delta } },
      { new: true }
    ).select("extraScans");
    if (!updated) return { success: false, error: "User not found" };

    return { success: true, extraScans: updated.extraScans };
  } catch {
    return { success: false, error: "Failed to add extra scans" };
  }
}

// Matches the legacy, pre-M22 public delivery type. Not a /g regex, so Mongoose
// can use it directly as a query value and repeated .test() calls are safe.
const LEGACY_UPLOAD_URL = /\/image\/upload\//;
const SIMULATION_IMAGE_FIELDS = ["scenarioA", "scenarioB", "resultA", "resultB"];
const legacySimulationFilter = {
  $or: SIMULATION_IMAGE_FIELDS.map((field) => ({ [`${field}.imageUrl`]: LEGACY_UPLOAD_URL })),
};

async function renamePublicIdToAuthenticated(publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams = `from_public_id=${publicId}&timestamp=${timestamp}&to_public_id=${publicId}&to_type=authenticated&type=upload`;
  const signature = signCloudinaryParams(signedParams);

  const form = new FormData();
  form.append("api_key", process.env.CLOUDINARY_API_KEY);
  form.append("from_public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("to_public_id", publicId);
  form.append("to_type", "authenticated");
  form.append("type", "upload");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/rename`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
  });
  const body = await res.json().catch(() => null);
  return res.ok && body?.public_id === publicId;
}

/**
 * One-time migration for M22 (AUDIT.md): selfies/simulation images uploaded
 * before that fix are Cloudinary's public `upload` type. This flips an
 * already-uploaded asset to `authenticated` in place via Cloudinary's rename
 * API (no re-upload of image bytes), then updates the stored URL so this
 * app's own signing/display code treats it as private going forward.
 *
 * Idempotent and resumable: each call only selects documents still containing
 * "/image/upload/", so repeated dryRun:false calls process the next batch
 * until nothing is left. Always run dryRun:true first to see the counts.
 */
export async function migrateImagesToAuthenticated({ dryRun = true, limit = 25 } = {}) {
  const session = await verifyAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  await connectDb();

  if (dryRun) {
    const [selfiesInBatch, simulationsInBatch, remainingSelfies, remainingSimulations] = await Promise.all([
      Selfie.countDocuments({ imageUrl: LEGACY_UPLOAD_URL }).limit(safeLimit),
      Simulation.countDocuments(legacySimulationFilter).limit(safeLimit),
      Selfie.countDocuments({ imageUrl: LEGACY_UPLOAD_URL }),
      Simulation.countDocuments(legacySimulationFilter),
    ]);
    return { success: true, dryRun: true, selfiesInBatch, simulationsInBatch, remainingSelfies, remainingSimulations };
  }

  const [selfies, simulations] = await Promise.all([
    Selfie.find({ imageUrl: LEGACY_UPLOAD_URL }).select("imageUrl").limit(safeLimit).lean(),
    Simulation.find(legacySimulationFilter).select(SIMULATION_IMAGE_FIELDS.join(" ")).limit(safeLimit).lean(),
  ]);

  let migrated = 0;
  let failed = 0;

  for (const selfie of selfies) {
    const publicId = getCloudinaryPublicId(selfie.imageUrl);
    if (!publicId) { failed++; continue; }
    try {
      if (!(await renamePublicIdToAuthenticated(publicId))) { failed++; continue; }
      await Selfie.updateOne(
        { _id: selfie._id },
        { $set: { imageUrl: selfie.imageUrl.replace(LEGACY_UPLOAD_URL, "/image/authenticated/") } }
      );
      migrated++;
    } catch {
      failed++;
    }
  }

  for (const sim of simulations) {
    const update = {};
    for (const field of SIMULATION_IMAGE_FIELDS) {
      const obj = sim[field];
      if (!obj?.imageUrl || !LEGACY_UPLOAD_URL.test(obj.imageUrl)) continue;
      const publicId = getCloudinaryPublicId(obj.imageUrl);
      if (!publicId) { failed++; continue; }
      try {
        if (!(await renamePublicIdToAuthenticated(publicId))) { failed++; continue; }
        update[field] = { ...obj, imageUrl: obj.imageUrl.replace(LEGACY_UPLOAD_URL, "/image/authenticated/") };
        migrated++;
      } catch {
        failed++;
      }
    }
    if (Object.keys(update).length > 0) {
      await Simulation.updateOne({ _id: sim._id }, { $set: update });
    }
  }

  const [remainingSelfies, remainingSimulations] = await Promise.all([
    Selfie.countDocuments({ imageUrl: LEGACY_UPLOAD_URL }),
    Simulation.countDocuments(legacySimulationFilter),
  ]);

  return { success: true, dryRun: false, migrated, failed, remainingSelfies, remainingSimulations };
}

export async function saveRoutineCompletion(time, step, isCompleted, timezone = "UTC") {
  timezone = normalizeTimezone(timezone);
  if (time !== "am" && time !== "pm") return { success: false };
  if (typeof step !== "string" || step.length === 0 || step.length > 200) return { success: false };

  try {
    const user = await getDbUser();
    if (!user) return { success: false };

    // Whitelist against the routine actually recommended to this user, rather
    // than trusting a client-supplied string verbatim (M18 in AUDIT.md) — also
    // what bounds amCompleted/pmCompleted to a handful of real entries.
    const latestSelfie = await Selfie.findOne({ userId: user._id, isAnalyzed: true })
      .sort({ takenAt: -1 })
      .select("amRoutine pmRoutine")
      .lean();
    const amRoutine = Array.isArray(latestSelfie?.amRoutine) ? latestSelfie.amRoutine : [];
    const pmRoutine = Array.isArray(latestSelfie?.pmRoutine) ? latestSelfie.pmRoutine : [];
    const routineSteps = time === "am" ? amRoutine : pmRoutine;
    if (!routineSteps.includes(step)) {
      return { success: false, error: "Unknown routine step." };
    }

    const todayStart = getLocalDayStart(timezone);
    const field = time === "am" ? "amCompleted" : "pmCompleted";

    // findOneAndUpdate(upsert) is one atomic operation — a plain findOne then
    // conditional create() raced two concurrent toggles into creating two
    // RoutineLog documents for the same day (M18 in AUDIT.md).
    const log = await RoutineLog.findOneAndUpdate(
      { userId: user._id, date: { $gte: todayStart } },
      {
        $setOnInsert: { userId: user._id, date: new Date() },
        [isCompleted ? "$addToSet" : "$pull"]: { [field]: step },
      },
      { upsert: true, new: true }
    );

    // "All done", not "started" — the achievement is Routine Master, not
    // Routine Starter (M18 in AUDIT.md: this used to fire once either list
    // had a single entry).
    const amAllDone = amRoutine.length > 0 && amRoutine.every((s) => log.amCompleted.includes(s));
    const pmAllDone = pmRoutine.length > 0 && pmRoutine.every((s) => log.pmCompleted.includes(s));
    if (amAllDone && pmAllDone) {
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
    
    const age = user.birthDate ? calculateAge(user.birthDate) : null;
    if (!age) return { success: false, error: "Age unknown" };

    const minAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - (age + 5)));
    const maxAgeDate = new Date(new Date().setFullYear(new Date().getFullYear() - (age - 5)));

    // Find users in same age bracket (±5 years) and opted in. Only _id is
    // ever used below, and — unlike the leaderboard — nothing here narrows
    // by location, so this needs its own safety cap (M19 in AUDIT.md).
    const peers = await User.find({
      optInComparison: true,
      birthDate: { $gte: minAgeDate, $lte: maxAgeDate },
      _id: { $ne: user._id }
    }).select("_id").limit(5000).lean();

    if (peers.length < 5) {
      return { success: true, notEnoughData: true };
    }

    const peerIds = peers.map(p => p._id);

    // Get latest score of user
    const userLatest = await Selfie.findOne({ userId: user._id, isAnalyzed: true }).sort({ takenAt: -1 }).lean();
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

/** Analyzed scans taken after the user's most recent report (or ever, if none). */
function scansSinceLastReportFilter(userId, lastReport) {
  const filter = { userId, isAnalyzed: true };
  if (lastReport) filter.takenAt = { $gt: lastReport.createdAt };
  return filter;
}

async function countScansSinceLastReport(userId) {
  const lastReport = await Report.findOne({ userId }).sort({ createdAt: -1 }).select("createdAt").lean();
  return Selfie.countDocuments(scansSinceLastReportFilter(userId, lastReport));
}

/**
 * Called after a successful scan. Once the user reaches SCANS_PER_REPORT new
 * scans, flags the report as ready and emails them exactly once per cycle (the
 * conditional update on reportReadyAt makes concurrent scans race-safe).
 */
async function notifyReportReadyIfDue(user) {
  try {
    const progress = getReportProgress(await countScansSinceLastReport(user._id));
    if (!progress.ready) return { ready: false, justUnlocked: false };

    const claimed = await User.findOneAndUpdate(
      { _id: user._id, reportReadyAt: null },
      { $set: { reportReadyAt: new Date() } }
    );
    if (claimed) {
      await sendReportReadyEmail({ email: user.email, name: user.displayName, scanCount: SCANS_PER_REPORT });
    }
    return { ready: true, justUnlocked: Boolean(claimed) };
  } catch (err) {
    console.error("Report-ready check failed:", err);
    return { ready: false, justUnlocked: false };
  }
}

/**
 * Progress toward the next report, for nav badges and the dashboard prompt.
 * Never redirects (it runs in the background from client components), so it
 * returns null when there is no signed-in, onboarded user.
 */
export async function getReportStatus() {
  try {
    await connectDb();
    const decoded = await getAuthenticatedUser().catch(() => null);
    if (!decoded) return null;
    const user = await findSessionUser(decoded);
    if (!user?.onboardingComplete) return null;
    return getReportProgress(await countScansSinceLastReport(user._id));
  } catch {
    return null;
  }
}

export async function generateReport(prevState, formData) {
  try {
    const user = await getDbUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const now = new Date();

    const lastReport = await Report.findOne({ userId: user._id }).sort({ createdAt: -1 }).select("createdAt").lean();
    const selfies = await Selfie.find(scansSinceLastReportFilter(user._id, lastReport)).sort({ takenAt: -1 });

    const progress = getReportProgress(selfies.length);
    if (!progress.ready) {
      return {
        success: false,
        error: `Your next report unlocks after ${SCANS_PER_REPORT} scans. You're at ${progress.count} of ${SCANS_PER_REPORT}, ${progress.remaining} to go!`,
      };
    }

    // Calculate metrics from scans
    const scores = selfies.map(s => s.overallScore).filter(s => typeof s === "number");
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
          if (typeof selfie.scores[key] === "number") {
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

    const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const periodLabel = `${fmtDay(selfies[selfies.length - 1].takenAt)} – ${fmtDay(selfies[0].takenAt)}`;

    const reportDoc = await Report.create({
      userId: user._id,
      type: 'weekly',
      title: `Weekly Skin Report · ${periodLabel}`,
      summary: `Across your last ${selfies.length} scans (${periodLabel}), your skin has shown ${reportData.trend} trends with an average harmony score of ${avgScore}/100.`,
      highlights: reportData.topMetrics.map(m => `${m.name.charAt(0).toUpperCase() + m.name.slice(1)}: ${m.score}/100`),
      compliments: reportData.compliments,
      scanCount: reportData.scanCount,
      averageScore: avgScore,
      trend: reportData.trend,
      trendValue: reportData.trendValue,
      aiGenerated: true,
    });

    await User.updateOne({ _id: user._id }, { $set: { reportReadyAt: null } });

    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Report generated successfully!",
      report: {
        id: reportDoc._id.toString(),
        type: reportDoc.type,
        title: reportDoc.title,
        date: reportDoc.createdAt,
        summary: reportDoc.summary,
        highlights: reportDoc.highlights,
        compliments: reportDoc.compliments,
        aiGenerated: reportDoc.aiGenerated,
      },
    };
  } catch (err) {
    console.error('Error generating report:', err);
    return { success: false, error: "Failed to generate report. Please try again." };
  }
}

export async function getUserReports() {
  const user = await getDbUser();
  const reports = await Report.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
  return reports.map((r) => ({
    id: r._id.toString(),
    type: r.type,
    title: r.title,
    date: r.createdAt,
    summary: r.summary,
    highlights: r.highlights || [],
    compliments: r.compliments || [],
    aiGenerated: r.aiGenerated,
    scanCount: r.scanCount ?? null,
    averageScore: r.averageScore ?? null,
    trend: r.trend || null,
    trendValue: r.trendValue ?? null,
  }));
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
      const userCountryCode = user.location?.countryCode || "";
      userFilter = {
        $or: [
          { 'location.country': { $regex: new RegExp(`^${escapedCountry}$`, 'i') } },
          { 'location.city': { $regex: new RegExp(`^${escapedCountry}$`, 'i') } },
          // location.country is sometimes missing even when the city was
          // resolved (e.g. the location prompt only returned a city/coords).
          // Those users still have a reliable countryCode from geocoding, so
          // match on that too — otherwise they silently never appear in the
          // country scope even though location.city plainly puts them there.
          ...(userCountryCode ? [{ 'location.countryCode': userCountryCode }] : [])
        ]
      };
    } else {
      // International / Global: all users
      userFilter = {};
    }

    // Find users who opted in to comparison (or self, so current user can see their own rank)
    // $and, not a spread: the country scope's filter is itself an $or, and a
    // second $or key would silently replace it (returning every country).
    // Candidates are ranked by score below, so this limit must be a DoS safety
    // valve only, never a pre-sort cutoff (a lower cap here silently dropped
    // genuine top scorers once a scope passed ~200 users).
    const matchingUsers = await User.find({
      $and: [
        userFilter,
        { $or: [{ optInComparison: true }, { _id: user._id }] },
      ],
    })
      .select('_id displayName photoURL location currentStreak optInComparison')
      .limit(5000)
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

