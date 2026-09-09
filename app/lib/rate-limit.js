/**
 * In-memory sliding window rate limiter.
 * Resets on process restart, suitable for burst protection on serverless/container runtimes.
 */

const rateLimitStore = new Map();

// Periodic sweep to prevent memory leak from abandoned keys
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now - record.windowStart > record.windowMs * 2) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Sweep every 5 minutes
}

/**
 * Check if an action by a user should be rate-limited.
 *
 * @param {string} identifier - Unique user ID or IP
 * @param {string} action - Action name (e.g. "analyze", "simulate", "upload")
 * @param {Object} [options]
 * @param {number} [options.maxRequests=5] - Maximum requests allowed within the window
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default: 1 min)
 * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
 */
export function checkRateLimit(identifier, action, { maxRequests = 5, windowMs = 60000 } = {}) {
  if (!identifier) {
    return { allowed: true, remaining: maxRequests, retryAfter: 0 };
  }

  const key = `${identifier}:${action}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    rateLimitStore.set(key, {
      windowStart: now,
      windowMs,
      count: 1,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfter: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((existing.windowStart + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    retryAfter: 0,
  };
}
