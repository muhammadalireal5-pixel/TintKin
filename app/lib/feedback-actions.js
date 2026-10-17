"use server";

import "server-only";
import * as Sentry from "@sentry/nextjs";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { connectDb, Feedback } from "./mongoose";
import { getAuthenticatedUser, findSessionUser } from "./auth-server";
import { verifyAdminSession } from "./admin-auth";
import { checkRateLimit } from "./rate-limit";

const TYPES = ["review", "feedback", "complaint", "idea", "bug", "other"];
const STATUSES = ["new", "in_progress", "resolved", "wont_fix"];
const PRIORITIES = ["low", "medium", "high"];
const MAX_MESSAGE = 2000;
const MAX_NOTE = 4000;
const PAGE_SIZE = 25;

// Strips control characters; React escapes the rest when it is displayed.
const clean = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

/** "Chrome on Android (mobile)" from a User-Agent, good enough to triage by. */
function describeDevice(ua = "") {
  const os = /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Windows/i.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Edg\//i.test(ua) ? "Edge"
    : /OPR\/|Opera/i.test(ua) ? "Opera"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Safari\//i.test(ua) ? "Safari" : "Unknown browser";
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
  return `${browser} on ${os} (${mobile})`;
}

/**
 * Signed-in users send a review, complaint, idea, etc. Stored privately for
 * the admin portal; nothing is ever returned to other users.
 */
export async function submitFeedback({ type, rating, message, page, viewport, theme } = {}) {
  try {
    await connectDb();
    const decoded = await getAuthenticatedUser().catch(() => null);
    if (!decoded) return { success: false, error: "Please sign in again to send feedback." };
    const user = await findSessionUser(decoded);
    if (!user) return { success: false, error: "Please sign in again to send feedback." };

    const text = clean(message, MAX_MESSAGE);
    if (text.length < 3) return { success: false, error: "Please write a few words first." };

    const limit = await checkRateLimit(`feedback:${user._id}`, "feedback", 6, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { success: false, error: "You've sent a lot of feedback already. Please try again a bit later." };
    }

    const ratingNum = Number(rating);
    const ua = clean((await headers()).get("user-agent") || "", 400);

    await Feedback.create({
      userId: user._id,
      userEmail: clean(user.email, 200),
      userName: clean(user.displayName, 80),
      tier: user.tier || "free",
      scanCount: user.scanCount || 0,
      type: TYPES.includes(type) ? type : "feedback",
      rating: Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null,
      message: text,
      page: typeof page === "string" && page.startsWith("/") ? clean(page, 200) : "",
      viewport: /^\d{2,5}x\d{2,5}$/.test(viewport || "") ? viewport : "",
      device: describeDevice(ua),
      userAgent: ua,
      theme: theme === "terracotta" ? "terracotta" : "rose",
    });
    return { success: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "submit-feedback" } });
    return { success: false, error: "Couldn't send that just now. Please try again." };
  }
}

function serialize(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId?.toString() || "",
    userEmail: doc.userEmail || "",
    userName: doc.userName || "",
    tier: doc.tier || "free",
    scanCount: doc.scanCount || 0,
    type: doc.type,
    rating: doc.rating ?? null,
    message: doc.message,
    page: doc.page || "",
    viewport: doc.viewport || "",
    device: doc.device || "",
    userAgent: doc.userAgent || "",
    theme: doc.theme || "",
    status: doc.status,
    priority: doc.priority || null,
    adminNote: doc.adminNote || "",
    resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt).toISOString() : null,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

const AUTH_ERROR = { success: false, error: "Please sign in again to continue." };

/** Admin only. Filterable, paginated list plus status counts for the tabs. */
export async function adminListFeedback({ status = "all", type = "all", search = "", page = 1 } = {}) {
  try {
    if (!(await verifyAdminSession())) return AUTH_ERROR;
    await connectDb();

    const filter = {};
    if (STATUSES.includes(status)) filter.status = status;
    if (TYPES.includes(type)) filter.type = type;
    const q = clean(search, 80);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ message: rx }, { userEmail: rx }, { userName: rx }, { adminNote: rx }, { page: rx }];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const [items, total, grouped] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      Feedback.countDocuments(filter),
      Feedback.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);

    const counts = { new: 0, in_progress: 0, resolved: 0, wont_fix: 0 };
    for (const g of grouped) if (g._id in counts) counts[g._id] = g.n;

    return {
      success: true,
      items: items.map(serialize),
      total,
      page: pageNum,
      pageSize: PAGE_SIZE,
      counts,
    };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-list-feedback" } });
    return { success: false, error: "Failed to load feedback." };
  }
}

/** Admin only. Triage fields: status, priority and a private "how I'll fix it" note. */
export async function adminUpdateFeedback(id, { status, priority, adminNote } = {}) {
  try {
    if (!(await verifyAdminSession())) return AUTH_ERROR;
    if (!mongoose.isValidObjectId(id)) return { success: false, error: "Invalid feedback id." };
    await connectDb();

    const $set = { updatedAt: new Date() };
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return { success: false, error: "Invalid status." };
      $set.status = status;
      $set.resolvedAt = status === "resolved" ? new Date() : null;
    }
    if (priority !== undefined) {
      if (priority !== null && priority !== "" && !PRIORITIES.includes(priority)) {
        return { success: false, error: "Invalid priority." };
      }
      $set.priority = priority || null;
    }
    if (adminNote !== undefined) $set.adminNote = clean(adminNote, MAX_NOTE);

    const doc = await Feedback.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!doc) return { success: false, error: "Feedback not found." };
    return { success: true, item: serialize(doc) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-update-feedback" } });
    return { success: false, error: "Failed to save changes." };
  }
}

export async function adminDeleteFeedback(id) {
  try {
    if (!(await verifyAdminSession())) return AUTH_ERROR;
    if (!mongoose.isValidObjectId(id)) return { success: false, error: "Invalid feedback id." };
    await connectDb();
    await Feedback.deleteOne({ _id: id });
    return { success: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-delete-feedback" } });
    return { success: false, error: "Failed to delete." };
  }
}
