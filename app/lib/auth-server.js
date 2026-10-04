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
    sv: session.user.sv || 0,
  };
}

/**
 * Resolves the session's database user by its Mongo id. Returns null when the
 * user no longer exists or the session was revoked (its sessionVersion no
 * longer matches), so callers treat it as signed out.
 * Caller must have awaited connectDb().
 * @param {{ uid: string, email?: string, sv?: number }} decoded
 */
export async function findSessionUser(decoded) {
  if (mongoose.Types.ObjectId.isValid(decoded.uid)) {
    const user = await User.findById(decoded.uid);
    if (!user || (user.sessionVersion || 0) !== (decoded.sv || 0)) return null;
    return user;
  }
  // Legacy sessions whose id predates Mongo ids: fall back to email only for
  // those, never for a stale Mongo id (that could attach an old token to a
  // newer account registered under the same address).
  if (decoded.email) {
    return User.findOne({ email: decoded.email.toLowerCase().trim() });
  }
  return null;
}

// Signs out a session that is present but no longer valid. Redirecting
// straight to /sign-in would loop: proxy.js bounces cookie holders to /dashboard.
export const SESSION_EXPIRED_PATH = "/api/session/expired";
