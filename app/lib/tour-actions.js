"use server";

import { connectDb, User } from "./mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";

// Only these walkthroughs exist, so the list on the account cannot be padded.
const TOUR_KEYS = ["today", "scan"];

async function sessionUser() {
  await connectDb();
  const decoded = await getAuthenticatedUser().catch(() => null);
  if (!decoded) return null;
  return findSessionUser(decoded);
}

/** Records that this person has finished or declined a Kin walkthrough, on their account (idempotent). */
export async function markTourSeen(key) {
  try {
    if (!TOUR_KEYS.includes(key)) return { success: false };
    const user = await sessionUser();
    if (!user) return { success: false };
    await User.updateOne({ _id: user._id }, { $addToSet: { seenTours: key } });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/** "Replay the walkthrough": forget which walkthroughs this person has seen. */
export async function resetSeenTours() {
  try {
    const user = await sessionUser();
    if (!user) return { success: false };
    await User.updateOne({ _id: user._id }, { $set: { seenTours: [] } });
    return { success: true };
  } catch {
    return { success: false };
  }
}
