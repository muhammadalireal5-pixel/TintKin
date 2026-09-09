"use server";

import { connectDb, User } from "@/app/lib/mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "fallback-secret-min-32-chars!!");

/**
 * Submits a new password after verifying the reset session cookie.
 */
export async function submitNewPassword(newPassword) {
  if (!newPassword || typeof newPassword !== "string") {
    return { success: false, error: "Invalid password." };
  }

  // NIST 800-63B compliant: minimum 12 characters
  if (newPassword.length < 12) {
    return { success: false, error: "Password must be at least 12 characters long." };
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("reset-session");
    
    if (!sessionCookie || !sessionCookie.value) {
      return { success: false, error: "Session expired. Please request a new reset link." };
    }

    // Verify and decode the JWT to get user email
    let userEmail;
    try {
      const { payload } = await jwtVerify(sessionCookie.value, SECRET);
      userEmail = payload.email;
    } catch {
      return { success: false, error: "Invalid session. Please request a new reset link." };
    }

    if (!userEmail) {
      return { success: false, error: "Session invalid. Please request a new reset link." };
    }

    // Check password against HIBP (fail open on error)
    try {
      const sha1 = crypto.createHash("sha1").update(newPassword).digest("hex").toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        signal: AbortSignal.timeout(3000)
      });
      
      if (res.ok) {
        const data = await res.text();
        const isBreached = data.split('\n').some(line => line.startsWith(suffix));
        if (isBreached) {
          return {
            success: false,
            error: "This password has been exposed in a data breach. Please choose a different password."
          };
        }
      } else {
        console.warn("[HIBP] API unavailable during password reset, proceeding");
      }
    } catch (err) {
      console.warn("[HIBP] Check failed during password reset:", err.message);
    }

    await connectDb();

    const cleanEmail = userEmail.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    await User.updateOne(
      { email: cleanEmail },
      { 
        passwordHash,
        passwordResetToken: undefined,
        passwordResetExpires: undefined 
      }
    );

    // Clear the session cookie after successful use
    cookieStore.delete("reset-session");

    return { success: true };
  } catch (error) {
    console.error("[PASSWORD_RESET] Error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}
