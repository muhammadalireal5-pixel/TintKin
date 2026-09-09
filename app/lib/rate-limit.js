import { connectDb, RateLimit } from "./mongoose";

const RATE_LIMIT_COLLECTION = "ratelimits";

/**
 * MongoDB-backed rate limiter with sliding window and atomic operations.
 * Uses TTL index for automatic cleanup (created via setup script or manually).
 * 
 * Setup: Run this once to create TTL index:
 * db.ratelimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 */
export async function checkRateLimit(identifier, action, limit, windowMs) {
  try {
    await connectDb();

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Atomic upsert: increment count if exists in window, or create new record
    const result = await RateLimit.findOneAndUpdate(
      {
        identifier,
        action,
        windowStart: { $gte: windowStart },
      },
      {
        $inc: { count: 1 },
        $set: {
          windowStart: now,
          expiresAt: new Date(now.getTime() + windowMs),
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    const currentCount = result.value?.count || 1;
    const resetTime = new Date(now.getTime() + windowMs);

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
    // Fail open: allow request if DB is unavailable to prevent DoS
    // Log warning for monitoring
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
