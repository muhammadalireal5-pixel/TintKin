"use server";

import { connectDb, User } from "@/app/lib/mongoose";
import crypto from "crypto";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret-min-32-chars!!");

/**
 * Exchanges a one-time reset token for a short-lived JWT session cookie.
 * Marks the token as consumed immediately to prevent reuse.
 */
export async function exchangeResetToken(token) {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Invalid reset token." };
  }

  try {
    await connectDb();

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return { success: false, error: "Reset link is invalid or has expired. Please request a new one." };
    }

    // Mark token as consumed IMMEDIATELY by clearing it from DB
    // This prevents any second use of the same link
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Create a signed JWT containing the user's email
    // This JWT will be stored in a short-lived cookie (5 minutes)
    const jwt = await new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(SECRET);

    const cookieStore = await cookies();
    cookieStore.set("reset-session", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/reset-password/form",
    });

    return { success: true };
  } catch (error) {
    console.error("[RESET_EXCHANGE] Error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
