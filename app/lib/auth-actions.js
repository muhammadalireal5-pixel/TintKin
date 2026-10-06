"use server";

import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { connectDb, User } from "./mongoose";
import { headers } from "next/headers";
import { checkRateLimit, getCompositeKey, RATE_LIMIT_CONFIGS } from "./rate-limit";
import { getAuthenticatedUser } from "./auth-server";
import { getBaseUrl } from "./url";

let resendClient = null;
function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Registers a new user with email, password, and name.
 */
export async function registerUser({ email, password, name } = {}) {
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { success: false, error: "Email and password are required." };
  }
  if (name != null && typeof name !== "string") {
    return { success: false, error: "Invalid name." };
  }

  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // NIST 800-63B compliant: minimum 12 characters, no composition rules
  if (password.length < 12) {
    return { success: false, error: "Password must be at least 12 characters long." };
  }
  // bcrypt silently ignores bytes past 72, so longer passwords would be truncated.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { success: false, error: "Password must be at most 72 bytes long." };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const rateCheck = await checkRateLimit(
    getCompositeKey(ip),
    "register",
    RATE_LIMIT_CONFIGS.REGISTER.limit,
    RATE_LIMIT_CONFIGS.REGISTER.windowMs
  );
  if (!rateCheck.allowed) {
    return { success: false, error: `Too many sign-up attempts. Please try again in ${Math.ceil(rateCheck.retryAfter / 60)} minutes.` };
  }

  // Check against breached passwords via HIBP API (fail open on error)
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { 
      signal: AbortSignal.timeout(3000) // 3 second timeout
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
      // HIBP API unavailable - log warning but proceed (fail open)
      console.warn("[HIBP] API unavailable, proceeding with registration");
    }
  } catch (err) {
    // Network error or timeout - fail open to prevent DoS
    console.warn("[HIBP] Check failed, proceeding with registration:", err.message);
  }

  await connectDb();

  const existingUser = await User.findOne({ email: cleanEmail }).select("+passwordHash");
  if (existingUser) {
    if (existingUser.passwordHash) {
      // Account already exists with password - silent return to prevent enumeration
      // Optionally send password reset email if this is a legitimate user
      return { success: true };
    }
    // Account exists without a password (Google or pre-migration account).
    // Never let an unauthenticated caller attach a password to it: email a
    // reset link instead so only the mailbox owner can claim the account.
    await requestPasswordReset(cleanEmail);
    return { success: true };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    email: cleanEmail,
    displayName: (name || "").trim().slice(0, 50),
    passwordHash,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  });

  // Best-effort: a failed send never blocks account creation. Defense-in-depth
  // (M21 in AUDIT.md) — the account pre-hijacking exploit this would also
  // guard against is already closed by the Google email_verified check (H1).
  await sendVerificationEmail(newUser).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  return { success: true };
}

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function sendVerificationEmail(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();

  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/api/verify-email?token=${rawToken}`;

  const resend = getResendClient();
  if (!resend) return;

  await resend.emails.send({
    from: "TintKin <onboarding@resend.dev>",
    to: [user.email],
    subject: "✦ Confirm your TintKin email",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAF9F6; border-radius: 16px; color: #2C3E50;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: #E6E6FA; font-size: 22px;">✦</span>
          <h1 style="color: #2C3E50; font-size: 22px; margin: 12px 0 4px; letter-spacing: -0.5px;">TintKin</h1>
          <p style="color: #7F8C8D; font-size: 14px; margin: 0;">Confirm Your Email</p>
        </div>
        <div style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #555; font-size: 14px; margin: 0 0 18px; line-height: 1.5;">
            Welcome to TintKin! Please confirm this is your email address.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #2C3E50; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            Confirm email
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          This link is valid for 24 hours. If you didn't create a TintKin account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

/**
 * Consumes a verification token from the confirm-email link.
 */
export async function verifyEmailToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return { success: false };

  await connectDb();
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  const user = await User.findOneAndUpdate(
    { emailVerificationToken: hashedToken, emailVerificationExpires: { $gt: new Date() } },
    { $set: { emailVerified: true }, $unset: { emailVerificationToken: "", emailVerificationExpires: "" } }
  );

  return { success: Boolean(user) };
}

/**
 * Re-sends the confirmation email for the currently signed-in user, if their
 * email isn't verified yet. Rate-limited the same as password-reset requests.
 */
export async function resendVerificationEmail() {
  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch {
    return { success: false, error: "Unauthorized" };
  }
  if (!decoded?.uid) return { success: false, error: "Unauthorized" };

  const rateCheck = await checkRateLimit(
    `email-verify:${decoded.uid}`,
    "password-reset",
    RATE_LIMIT_CONFIGS.PASSWORD_RESET.limit,
    RATE_LIMIT_CONFIGS.PASSWORD_RESET.windowMs
  );
  if (!rateCheck.allowed) {
    return { success: false, error: `Too many requests. Please try again in ${Math.ceil(rateCheck.retryAfter / 60)} minutes.` };
  }

  await connectDb();
  const user = await User.findById(decoded.uid);
  if (!user || user.emailVerified || !user.passwordHash) {
    // Silent success: nothing to do for a Google-only or already-verified account.
    return { success: true };
  }

  await sendVerificationEmail(user).catch((err) => {
    console.error("Failed to send verification email:", err);
  });
  return { success: true };
}

/**
 * Requests a password reset link sent to the user's email via Resend.
 */
export async function requestPasswordReset(email) {
  if (!email || typeof email !== "string") {
    return { success: true }; // Silent return for security
  }

  const cleanEmail = email.toLowerCase().trim();
  
  // Get client IP for rate limiting (will be passed from request context)
  // For server actions, we use a generic identifier since IP isn't directly available
  const identifier = `email:${cleanEmail}`;
  
  // Check rate limit (3 per hour per email)
  const rateLimitResult = await checkRateLimit(
    identifier,
    "password-reset",
    RATE_LIMIT_CONFIGS.PASSWORD_RESET.limit,
    RATE_LIMIT_CONFIGS.PASSWORD_RESET.windowMs
  );
  
  if (!rateLimitResult.allowed) {
    // Still return success to prevent enumeration, but don't send email
    console.warn(`[PASSWORD_RESET] Rate limited for ${cleanEmail}`);
    return { success: true };
  }

  await connectDb();

  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    // Avoid leaking account existence
    return { success: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;
  await user.save();

  const baseUrl = getBaseUrl();
  // Use one-time exchange URL instead of direct reset form
  const exchangeUrl = `${baseUrl}/reset-password/exchange?token=${rawToken}`;

  try {
    const resend = getResendClient();
    if (resend) {
      await resend.emails.send({
        from: "TintKin <onboarding@resend.dev>",
        to: [cleanEmail],
        subject: "✦ Reset your TintKin password",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAF9F6; border-radius: 16px; color: #2C3E50;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: #E6E6FA; font-size: 22px;">✦</span>
              <h1 style="color: #2C3E50; font-size: 22px; margin: 12px 0 4px; letter-spacing: -0.5px;">TintKin</h1>
              <p style="color: #7F8C8D; font-size: 14px; margin: 0;">Password Reset Request</p>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #EAE6DF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #555; font-size: 14px; margin: 0 0 18px; line-height: 1.5;">
                We received a request to reset your password. Click the button below to choose a new password:
              </p>
              <a href="${exchangeUrl}" style="display: inline-block; background: #2C3E50; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This link is valid for 1 hour and can only be used once. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    }
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  return { success: true };
}
