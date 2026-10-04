"use server";

import "server-only";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { checkRateLimit } from "./rate-limit";

function getAdminEmail() {
  const configured = process.env.ADMIN_EMAIL;
  if (!configured) throw new Error("ADMIN_EMAIL is not configured");
  return configured.toLowerCase().trim();
}

function getAdminPassword() {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) throw new Error("ADMIN_PASSWORD is not configured");
  return configured;
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return secret;
}

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Hash both sides first so timingSafeEqual always compares equal-length
// buffers and the comparison doesn't leak the configured value's length.
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Short fingerprint of the configured password, baked into the session token so
// rotating ADMIN_PASSWORD immediately invalidates every existing admin session.
function passwordFingerprint() {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(getAdminPassword())
    .digest("base64url")
    .slice(0, 16);
}

export async function adminLogin(email, password) {
  let adminEmail;
  let adminPassword;
  try {
    adminEmail = getAdminEmail();
    adminPassword = getAdminPassword();
    getSessionSecret();
  } catch {
    return { success: false, error: "Admin login is not configured." };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  const rate = await checkRateLimit(`ip:${ip}`, "admin_login", LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rate.allowed) {
    return { success: false, status: 429, error: "Too many attempts. Try again in a few minutes." };
  }

  const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
  const suppliedPassword = typeof password === "string" ? password : "";

  // Evaluate both checks unconditionally so a wrong email and a wrong password
  // take the same time and return the same message.
  const emailOk = safeEqual(normalizedEmail, adminEmail);
  const passwordOk = safeEqual(suppliedPassword, adminPassword);
  if (!emailOk || !passwordOk) {
    return { success: false, status: 401, error: "Incorrect email or password." };
  }

  const token = signAdminToken({
    email: adminEmail,
    pv: passwordFingerprint(),
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set("admin-session", token, {
    httpOnly: true,
    secure: true, // Always enforce HTTPS - use mkcert/local HTTPS for dev
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_MS / 1000,
  });

  return { success: true };
}

function signAdminToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export async function verifyAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-session")?.value || cookieStore.get("admin_session")?.value;
    if (!token) return null;

    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", getSessionSecret())
      .update(encoded)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());

    if (payload.expiresAt < Date.now()) return null;
    if (payload.email !== getAdminEmail()) return null;
    if (payload.pv !== passwordFingerprint()) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
  cookieStore.delete("admin_session");
  return { success: true };
}
