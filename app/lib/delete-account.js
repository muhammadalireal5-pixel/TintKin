"use server";

import "server-only";
import { getAuthenticatedUser } from "@/app/lib/auth-server";
import { connectDb, User, Selfie, Lifestyle, Simulation, RoutineLog, Report, RateLimit } from "./mongoose";
import { deleteCloudinaryAsset } from "@/lib/utils/cloudinary";

/**
 * Permanently deletes the authenticated user's account and all associated personal data:
 * - Profile information and credentials
 * - All uploaded selfies from database and Cloudinary storage
 * - All simulation runs and images
 * - All lifestyle tracking entries
 * - All routine completion logs
 */
export async function deleteUserAccount() {
  const authUser = await getAuthenticatedUser();
  if (!authUser?.uid) {
    return { success: false, error: "Please sign in again to continue." };
  }

  await connectDb();

  const userId = authUser.uid;
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, error: "We couldn't find your account. Try signing in again." };
  }

  try {
    // 1. Fetch all selfies to delete Cloudinary assets
    const selfies = await Selfie.find({ userId }).select("imageUrl");
    const selfieImageDeletions = selfies.map((s) => deleteCloudinaryAsset(s.imageUrl));

    // 2. Fetch all simulations to clean up any Cloudinary images
    const simulations = await Simulation.find({ userId }).select("scenarioA scenarioB resultA resultB");
    const simulationImageDeletions = [];
    for (const sim of simulations) {
      if (sim.resultA?.imageUrl) simulationImageDeletions.push(deleteCloudinaryAsset(sim.resultA.imageUrl));
      if (sim.resultB?.imageUrl) simulationImageDeletions.push(deleteCloudinaryAsset(sim.resultB.imageUrl));
      if (sim.scenarioA?.imageUrl) simulationImageDeletions.push(deleteCloudinaryAsset(sim.scenarioA.imageUrl));
      if (sim.scenarioB?.imageUrl) simulationImageDeletions.push(deleteCloudinaryAsset(sim.scenarioB.imageUrl));
    }

    // 3. User profile photo if hosted on Cloudinary
    if (user.photoURL && user.photoURL.includes("cloudinary.com")) {
      selfieImageDeletions.push(deleteCloudinaryAsset(user.photoURL));
    }

    // Execute cloud storage cleanups concurrently
    await Promise.allSettled([...selfieImageDeletions, ...simulationImageDeletions]);

    // 4. Delete all database documents associated with the user
    await Promise.all([
      Selfie.deleteMany({ userId }),
      Lifestyle.deleteMany({ userId }),
      Simulation.deleteMany({ userId }),
      RoutineLog.deleteMany({ userId }),
      Report.deleteMany({ userId }),
      RateLimit.deleteMany({ identifier: String(userId) }),
      User.findByIdAndDelete(userId),
    ]);

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete account. Please try again or contact support." };
  }
}
