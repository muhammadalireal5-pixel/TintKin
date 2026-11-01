"use server";

import "server-only";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { checkRateLimit } from "./rate-limit";
import { getClientIp } from "./request-ip";
import { connectDb, AdminAuthState } from "./mongoose";

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

function getViewer() {
  const email = process.env.ADMIN_VIEWER_EMAIL;
  const password = process.env.ADMIN_VIEWER_PASSWORD;
  if (!email || !password) return null;
  return { email: email.toLowerCase().trim(), password };
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
function passwordFingerprint(role = "owner") {
  const password = role === "viewer" ? getViewer()?.password : getAdminPassword();
  if (!password) return null;
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${role}:${password}`)
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
  const ip = getClientIp(requestHeaders) || "no-origin";
  const rate = await checkRateLimit(`ip:${ip}`, "admin_login", LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rate.allowed) {
    return { success: false, status: 429, error: "Too many attempts. Try again in a few minutes." };
  }

  const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
  const suppliedPassword = typeof password === "string" ? password : "";

  // Evaluate both checks unconditionally so a wrong email and a wrong password
  // take the same time and return the same message.
  const viewer = getViewer();
  const ownerOk = safeEqual(normalizedEmail, adminEmail) & safeEqual(suppliedPassword, adminPassword);
  const viewerOk = viewer ? safeEqual(normalizedEmail, viewer.email) & safeEqual(suppliedPassword, viewer.password) : 0;
  if (!ownerOk && !viewerOk) {
    return { success: false, status: 401, error: "Incorrect email or password." };
  }
  const role = ownerOk ? "owner" : "viewer";

  const token = signAdminToken({
    email: role === "owner" ? adminEmail : viewer.email,
    role,
    pv: passwordFingerprint(role),
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
    const role = payload.role === "viewer" ? "viewer" : "owner";
    const expectedEmail = role === "viewer" ? getViewer()?.email : getAdminEmail();
    if (!expectedEmail || payload.email !== expectedEmail) return null;
    if (payload.pv !== passwordFingerprint(role)) return null;
    payload.role = role;

    await connectDb();
    const state = await AdminAuthState.findById("singleton").lean();
    if (state?.revokedBefore && payload.loginAt < new Date(state.revokedBefore).getTime()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminOwner() {
  const session = await verifyAdminSession();
  return session?.role === "owner" ? session : null;
}

export async function adminLogout() {
  const session = await verifyAdminSession();
  if (session?.role === "viewer") {
    const cookieStore = await cookies();
    cookieStore.delete("admin-session");
    cookieStore.delete("admin_session");
    return { success: true };
  }
  try {
    await connectDb();
    await AdminAuthState.findByIdAndUpdate(
      "singleton",
      { revokedBefore: new Date() },
      { upsert: true }
    );
  } catch {
    // If this fails, logout still clears the cookie below; the stolen-token
    // window just isn't shortened this time.
  }

  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
  cookieStore.delete("admin_session");
  return { success: true };
}
