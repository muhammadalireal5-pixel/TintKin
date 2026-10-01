import "server-only";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { User } from "@/app/lib/mongoose";

/**
 * Retrieves the current authenticated user session in Server Components and Server Actions.
 * Preserves the decoded token contract { uid, email, name, picture } where uid is the MongoDB user ID.
 * @returns {Promise<{ uid: string, email: string, name: string, picture: string|null }>}
 */
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No session token");
  }

  return {
    uid: session.user.id,
    email: session.user.email,
    name: session.user.name || "",
    picture: session.user.image || null,
  };
}

/**
 * Resolves the session's database user: by Mongo id first, then by email.
 * Caller must have awaited connectDb(). Returns null when no user matches.
 * @param {{ uid: string, email?: string }} decoded
 */
export async function findSessionUser(decoded) {
  let user = null;
  if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
    user = await User.findById(decoded.uid);
  }
  if (!user && decoded.email) {
    user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
  }
  return user;
}
