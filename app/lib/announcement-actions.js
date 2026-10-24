"use server";

import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { connectDb, User } from "./mongoose";
import { CURRENT_ANNOUNCEMENT } from "@/lib/constants/announcements";

/** Marks the current announcement as seen for the signed-in user (idempotent). */
export async function dismissAnnouncement(id) {
  try {
    // Only the live announcement can be recorded, so the list can't be padded.
    if (id !== CURRENT_ANNOUNCEMENT.id) return { success: false };
    await connectDb();
    const decoded = await getAuthenticatedUser().catch(() => null);
    if (!decoded) return { success: false };
    const user = await findSessionUser(decoded);
    if (!user) return { success: false };
    await User.updateOne({ _id: user._id }, { $addToSet: { seenAnnouncements: id } });
    return { success: true };
  } catch {
    return { success: false };
  }
}
