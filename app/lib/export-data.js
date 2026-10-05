"use server";

import "server-only";
import { zipSync, strToU8 } from "fflate";
import { Resend } from "resend";
import { getAuthenticatedUser } from "@/app/lib/auth-server";
import { connectDb, User, Selfie, Lifestyle, Simulation, RoutineLog } from "./mongoose";
import { signCloudinaryUrl } from "@/lib/utils/cloudinary";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "./rate-limit";

let resendClient = null;
function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Resend caps a whole message around 40MB; base64 inflates the raw ZIP by
// ~33%, so this is a conservative ceiling on the *decoded* archive size.
const MAX_EMAILABLE_EXPORT_BYTES = 20 * 1024 * 1024;

/**
 * Exports all personal data and images for the authenticated user
 * in accordance with GDPR Art. 15 (Right of Access) & Art. 20 (Data Portability).
 * 
 * Bundles profile data, wellness metrics, routine logs, simulation models,
 * and downloaded image copies into an in-memory ZIP archive.
 */
export async function exportUserData() {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.uid) {
    return { success: false, error: "Unauthorized" };
  }

  await connectDb();

  const userId = authUser.uid;
  const user = await User.findById(userId)
    .select("-passwordHash -passwordResetToken -passwordResetExpires -__v")
    .lean();

  if (!user) {
    return { success: false, error: "User not found" };
  }

  try {
    const [selfies, lifestyles, simulations, routineLogs] = await Promise.all([
      Selfie.find({ userId }).select("-__v").sort({ takenAt: -1 }).lean(),
      Lifestyle.find({ userId }).select("-__v").sort({ date: -1 }).lean(),
      Simulation.find({ userId }).select("-__v").sort({ createdAt: -1 }).lean(),
      RoutineLog.find({ userId }).select("-__v").sort({ date: -1 }).lean(),
    ]);

    const exportManifest = {
      manifestVersion: "1.0.0",
      exportDate: new Date().toISOString(),
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
        birthDate: user.birthDate,
        sex: user.sex,
        skinType: user.skinType,
        goals: user.goals,
        customGoal: user.customGoal,
        tier: user.tier,
        location: user.location,
        badges: user.badges,
        streaks: {
          current: user.currentStreak,
          longest: user.longestStreak,
          lastUploadDate: user.lastUploadDate,
        },
        photoPrivacy: user.photoPrivacy,
      },
      selfies: selfies.map((s) => ({
        id: s._id.toString(),
        takenAt: s.takenAt,
        overallScore: s.overallScore,
        skinAge: s.skinAge,
        scores: s.scores,
        critique: s.critique,
        habits: s.habits,
        facialWorkout: s.facialWorkout,
        amRoutine: s.amRoutine,
        pmRoutine: s.pmRoutine,
        recommendedProducts: s.recommendedProducts,
        // Signed: the image itself is in photos/ in this same ZIP, but the
        // link is still useful on its own, and an unsigned `authenticated`-
        // type Cloudinary URL (see M22 in AUDIT.md) is simply dead on arrival.
        imageUrl: signCloudinaryUrl(s.imageUrl),
      })),
      lifestyleLogs: lifestyles.map((l) => ({
        id: l._id.toString(),
        date: l.date,
        sleepHours: l.sleepHours,
        spfUsed: l.spfUsed,
        uvMinutes: l.uvMinutes,
        sugarServings: l.sugarServings,
        smokeCigarettes: l.smokeCigarettes,
        exerciseMinutes: l.exerciseMinutes,
      })),
      simulations: simulations.map((sim) => ({
        id: sim._id.toString(),
        name: sim.name,
        targetAge: sim.targetAge,
        // Signed for the same reason as selfies.imageUrl above.
        scenarioA: sim.scenarioA ? { ...sim.scenarioA, imageUrl: signCloudinaryUrl(sim.scenarioA.imageUrl) } : sim.scenarioA,
        scenarioB: sim.scenarioB ? { ...sim.scenarioB, imageUrl: signCloudinaryUrl(sim.scenarioB.imageUrl) } : sim.scenarioB,
        deltas: sim.deltas,
        resultA: sim.resultA ? { ...sim.resultA, imageUrl: signCloudinaryUrl(sim.resultA.imageUrl) } : sim.resultA,
        resultB: sim.resultB ? { ...sim.resultB, imageUrl: signCloudinaryUrl(sim.resultB.imageUrl) } : sim.resultB,
        createdAt: sim.createdAt,
      })),
      routineLogs: routineLogs.map((r) => ({
        id: r._id.toString(),
        date: r.date,
        amCompleted: r.amCompleted,
        pmCompleted: r.pmCompleted,
      })),
    };

    /** @type {Record<string, Uint8Array>} */
    const zipEntries = {
      "user_data.json": strToU8(JSON.stringify(exportManifest, null, 2)),
    };

    // Concurrently fetch and archive personal photo assets
    const photoFetchPromises = selfies.map(async (selfie, idx) => {
      if (!selfie.imageUrl || !selfie.imageUrl.startsWith("http")) return;

      try {
        // Must be signed: an `authenticated`-type Cloudinary asset (M22 in
        // AUDIT.md) 401s on any unsigned fetch, same as every other direct
        // download of a stored imageUrl in this codebase.
        const response = await fetch(signCloudinaryUrl(selfie.imageUrl), { signal: AbortSignal.timeout(15000) });
        if (!response.ok) return;

        const arrayBuf = await response.arrayBuffer();
        const dateStr = new Date(selfie.takenAt || Date.now()).toISOString().slice(0, 10);
        const fileName = `photos/selfie_${dateStr}_${idx + 1}.jpg`;
        zipEntries[fileName] = new Uint8Array(arrayBuf);
      } catch (e) {
        // Continue archiving remaining files if one photo fails
      }
    });

    // Also fetch profile photo if exists
    if (user.photoURL && user.photoURL.startsWith("http")) {
      photoFetchPromises.push(
        (async () => {
          try {
            const resp = await fetch(user.photoURL, { signal: AbortSignal.timeout(15000) });
            if (resp.ok) {
              const buf = await resp.arrayBuffer();
              zipEntries["photos/profile_photo.jpg"] = new Uint8Array(buf);
            }
          } catch (e) {}
        })()
      );
    }

    await Promise.allSettled(photoFetchPromises);

    const zipped = zipSync(zipEntries, { level: 6 });
    const base64Zip = Buffer.from(zipped).toString("base64");
    const dateFormatted = new Date().toISOString().slice(0, 10);

    return {
      success: true,
      base64Zip,
      filename: `tintkin-gdpr-export-${dateFormatted}.zip`,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to compile your data export. Please try again or reach out to support.",
    };
  }
}

/**
 * Builds the same export as exportUserData() and emails it as a ZIP
 * attachment instead of returning it for a browser download.
 */
export async function emailUserDataExport() {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.uid) {
    return { success: false, error: "Unauthorized" };
  }

  const rateCheck = await checkRateLimit(authUser.uid, "export", RATE_LIMIT_CONFIGS.DATA_EXPORT.limit, RATE_LIMIT_CONFIGS.DATA_EXPORT.windowMs);
  if (!rateCheck.allowed) {
    return { success: false, error: `Too many export requests. Please try again in ${Math.ceil(rateCheck.retryAfter / 60)} minutes.` };
  }

  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "Email delivery isn't configured. Please use the direct download instead." };
  }

  await connectDb();
  const user = await User.findById(authUser.uid).select("email displayName").lean();
  if (!user?.email) {
    return { success: false, error: "No email address on file." };
  }

  const result = await exportUserData();
  if (!result.success) return result;

  const zipBytes = Buffer.byteLength(result.base64Zip, "base64");
  if (zipBytes > MAX_EMAILABLE_EXPORT_BYTES) {
    return {
      success: false,
      error: "Your export is too large to email (you have a lot of saved photos). Please use the direct download instead.",
    };
  }

  try {
    await resend.emails.send({
      from: "TintKin <onboarding@resend.dev>",
      to: [user.email],
      subject: "✦ Your TintKin data export",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAF9F6; border-radius: 16px; color: #2C3E50;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: #E6E6FA; font-size: 22px;">✦</span>
            <h1 style="color: #2C3E50; font-size: 22px; margin: 12px 0 4px; letter-spacing: -0.5px;">TintKin</h1>
            <p style="color: #7F8C8D; font-size: 14px; margin: 0;">Your Data Export</p>
          </div>
          <div style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.5;">
              Attached is a complete copy of your TintKin data: profile, scan history, saved simulations, routine logs and your stored photos, as a ZIP file.
            </p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            You requested this from Settings. If you didn't, please contact support.
          </p>
        </div>
      `,
      attachments: [{ filename: result.filename, content: result.base64Zip }],
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to email data export:", err);
    return { success: false, error: "Failed to send the export email. Please try again." };
  }
}
