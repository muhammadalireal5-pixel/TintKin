"use server";

import crypto from "crypto";
import { Resend } from "resend";
import { cookies } from "next/headers";

let resendClient = null;
function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const ADMIN_EMAIL = "muhammad0alire@gmail.com";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_OTP_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// { code, expiresAt, used }
let otpStore = null;

const rateLimitLog = []; // timestamps of OTP requests

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function checkRateLimit() {
  const now = Date.now();
  // Remove entries older than the window
  while (rateLimitLog.length > 0 && rateLimitLog[0] < now - RATE_LIMIT_WINDOW_MS) {
    rateLimitLog.shift();
  }
  if (rateLimitLog.length >= MAX_OTP_REQUESTS) {
    return false;
  }
  rateLimitLog.push(now);
  return true;
}

export async function sendAdminOTP(email) {
  // Only allow the admin email
  if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
    // Return generic response — don't leak whether the email exists
    return { success: true }; // Silently succeed to avoid email enumeration
  }

  if (!checkRateLimit()) {
    return { success: false, error: "Too many attempts. Try again later." };
  }

  const code = generateOTP();
  otpStore = {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    used: false,
  };

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: "TintKin Admin <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: `🔐 TintKin Admin — Your code is ${code}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 420px; margin: 0 auto; padding: 40px 24px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(230,230,250,0.15); font-size: 24px;">✦</span>
            <h1 style="color: #E6E6FA; font-size: 20px; margin: 12px 0 4px; letter-spacing: -0.5px;">TintKin Admin</h1>
            <p style="color: rgba(230,230,250,0.5); font-size: 13px; margin: 0;">Verification Code</p>
          </div>
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(230,230,250,0.1); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: rgba(230,230,250,0.6); font-size: 13px; margin: 0 0 12px;">Your one-time code:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #E6E6FA; font-family: 'SF Mono', 'Fira Code', monospace;">${code}</div>
          </div>
          <p style="color: rgba(230,230,250,0.4); font-size: 12px; text-align: center; margin: 0;">
            Expires in 5 minutes · Do not share this code
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error("[Admin OTP] Failed to send:", err);
    return { success: false, error: "Failed to send OTP. Try again." };
  }
}

export async function verifyAdminOTP(email, code) {
  if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
    return { success: false, error: "Invalid credentials." };
  }

  if (!otpStore || otpStore.used) {
    return { success: false, error: "No OTP found. Please request a new one." };
  }

  if (Date.now() > otpStore.expiresAt) {
    otpStore = null;
    return { success: false, error: "OTP expired. Please request a new one." };
  }

  if (otpStore.code !== code.trim()) {
    return { success: false, error: "Invalid code. Please try again." };
  }

  // Mark as used (single-use)
  otpStore.used = true;

  // Create session
  const token = signAdminToken({
    email: ADMIN_EMAIL,
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set("admin-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_EXPIRY_MS / 1000, // seconds
  });

  return { success: true };
}

function signAdminToken(payload) {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export async function verifyAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session")?.value;
    if (!token) return null;

    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
      .update(encoded)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());

    if (payload.expiresAt < Date.now()) return null;
    if (payload.email !== ADMIN_EMAIL) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
  return { success: true };
}
