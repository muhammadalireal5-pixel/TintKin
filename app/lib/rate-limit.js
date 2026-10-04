import * as Sentry from "@sentry/nextjs";
import { connectDb, RateLimit } from "./mongoose";

const RATE_LIMIT_COLLECTION = "ratelimits";

/**
 * Returns the start of the fixed window containing `nowMs`.
 * @param {number} nowMs
 * @param {number} windowMs
 */
export function getWindowStart(nowMs, windowMs) {
  return Math.floor(nowMs / windowMs) * windowMs;
}

/**
 * MongoDB-backed fixed-window rate limiter with atomic operations.
 * Uses TTL index for automatic cleanup (created via setup script or manually).
 *
 * Each (identifier, action) gets one counter per fixed window. Previously every
 * request moved `windowStart` to "now", so a steady requester's window never
 * expired and the count only ever grew (eventually locking out normal use).
 *
 * Setup: Run this once to create TTL index:
 * db.ratelimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 */
export async function checkRateLimit(identifier, action, limit, windowMs) {
  try {
    await connectDb();

    const now = new Date();
    const bucketStart = getWindowStart(now.getTime(), windowMs);
    const resetTime = new Date(bucketStart + windowMs);

    // Atomic upsert: increment this window's counter, creating it on first hit.
    const result = await RateLimit.findOneAndUpdate(
      {
        identifier,
        action,
        windowStart: new Date(bucketStart),
      },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          createdAt: now,
          expiresAt: resetTime,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    const currentCount = result?.count || 1;

    if (currentCount > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: limit - currentCount,
      resetTime,
      retryAfter: null,
    };
  } catch (error) {
    console.error("Rate limit check failed (failing open):", error);
    // Fail open: allow request if DB is unavailable to prevent DoS.
    // Report to Sentry since a silent fail-open here means rate limiting
    // is effectively disabled until the DB is reachable again.
    Sentry.captureException(error, {
      tags: { scope: "rate-limit-fail-open", action },
    });
    console.warn(`[RATE_LIMIT] DB unavailable, failing open for ${identifier}:${action}`);
    return {
      allowed: true,
      remaining: limit,
      resetTime: new Date(Date.now() + windowMs),
      retryAfter: null,
    };
  }
}

/**
 * Composite key generator for IP+Email combinations
 * Hashes the combination to avoid storing raw emails in rate limit collection
 */
export function getCompositeKey(ip, email = null) {
  const crypto = require("crypto");
  if (!email) {
    return `ip:${ip}`;
  }
  return crypto
    .createHash("sha256")
    .update(`${ip}:${email}`)
    .digest("hex");
}

/**
 * Rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  LOGIN: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  REGISTER: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
};
