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
    // Fail open: allow request if DB is unavailable to prevent DoS.
    // Report to Sentry since a silent fail-open here means rate limiting
    // is effectively disabled until the DB is reachable again.
    Sentry.captureException(error, {
      tags: { scope: "rate-limit-fail-open", action },
      extra: { identifier },
    });
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
  // Per IP+email: caps repeated signup attempts against one identity (same as LOGIN).
  REGISTER: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  // Per IP only, deliberately looser: a backstop against mass account creation
  // from one source, without penalizing many distinct real users behind one
  // shared IP (school/office WiFi, mobile carrier NAT).
  REGISTER_IP: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  DATA_EXPORT: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour — builds a ZIP and sends an email, both non-trivial cost
  // Shared, email-independent floor for requests with no identifiable IP at
  // all (see checkOriginAwareRateLimit). Deliberately tight and global per
  // action: better that no-origin traffic degrades for everyone than that an
  // attacker gets an email-only key to target one victim with.
  NO_ORIGIN_FLOOR: { limit: 10, windowMs: 60 * 60 * 1000 },
};

/**
 * Rate-limits an identity (ip+email) action without ever falling back to an
 * email-only key.
 *
 * `checkRateLimit(getCompositeKey(ip, email), ...)` is only as safe as `ip`
 * is trustworthy and present. When `getClientIp` (request-ip.js) can't find
 * one at all, keying on email alone would let anyone who merely knows a
 * victim's email address exhaust their rate limit — no network position or
 * header spoofing required, since the "ip" component would be the same
 * constant for every caller. Instead, no-origin traffic is capped by a
 * single shared, action-wide bucket with no email in the key: it can still
 * be exhausted, but doing so blocks every other no-origin request for that
 * action too (including the attacker's own next attempt), not just one
 * victim's.
 */
export async function checkOriginAwareRateLimit({ ip, email, action, limit, windowMs }) {
  if (ip) {
    return checkRateLimit(getCompositeKey(ip, email), action, limit, windowMs);
  }
  return checkRateLimit(
    `no-origin:${action}`,
    action,
    RATE_LIMIT_CONFIGS.NO_ORIGIN_FLOOR.limit,
    RATE_LIMIT_CONFIGS.NO_ORIGIN_FLOOR.windowMs
  );
}
