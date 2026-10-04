"use server";

import { connectDb, User } from "@/app/lib/mongoose";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import { getResetSecret } from "@/app/lib/reset-secret";

/**
 * Exchanges a one-time reset token for a short-lived JWT session cookie, then
 * redirects to the password form. Must run as a Server Action (form POST):
 * cookies can't be set during a Server Component render, and consuming the
 * token on GET would let email link scanners burn it before the user clicks.
 */
export async function exchangeResetToken(formData) {
  const token = formData?.get("token");
  if (!token || typeof token !== "string" || token.length > 256) {
    redirect("/reset-password/exchange?status=invalid");
  }

  let email = null;
  try {
    await connectDb();

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Atomic find-and-clear so two concurrent submissions can't both succeed.
    const user = await User.findOneAndUpdate(
      { passwordResetToken: hashedToken, passwordResetExpires: { $gt: new Date() } },
      { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }
    ).select("email");

    if (user) {
      email = user.email;
      const jwt = await new SignJWT({ email })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(getResetSecret());

      const cookieStore = await cookies();
      cookieStore.set("reset-session", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 300,
        path: "/reset-password/form",
      });
    }
  } catch (error) {
    console.error("[RESET_EXCHANGE] Error:", error?.message || error);
    redirect("/reset-password/exchange?status=error");
  }

  redirect(email ? "/reset-password/form" : "/reset-password/exchange?status=invalid");
}
