"use server";

import "server-only";
import { zipSync, strToU8 } from "fflate";
import { getAuthenticatedUser } from "@/app/lib/auth-server";
import { connectDb, User, Selfie, Lifestyle, Simulation, RoutineLog } from "./mongoose";

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
        imageUrl: s.imageUrl,
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
        scenarioA: sim.scenarioA,
        scenarioB: sim.scenarioB,
        deltas: sim.deltas,
        resultA: sim.resultA,
        resultB: sim.resultB,
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
        const response = await fetch(selfie.imageUrl);
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
            const resp = await fetch(user.photoURL);
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
