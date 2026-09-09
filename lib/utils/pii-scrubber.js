/**
 * PII Sanitizer for Sentry and Telemetry.
 * Ensures error logs never retain personal identifiable data (GDPR/CCPA compliance).
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const IMAGE_URL_REGEX = /https?:\/\/[^\s"']*(?:cloudinary\.com|s3[.-]|blob:|data:image)[^\s"']*/gi;
const QUERY_PARAM_PII_REGEX = /([?&](?:token|code|secret|email|password|key)=)[^&]+/gi;

/**
 * Scrubs strings of emails, image URLs, and sensitive query parameters.
 * @param {string} str
 * @returns {string}
 */
export function scrubText(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
    .replace(IMAGE_URL_REGEX, "[REDACTED_IMAGE_URL]")
    .replace(QUERY_PARAM_PII_REGEX, "$1[REDACTED]");
}

/**
 * Recursively cleans object values.
 * @param {any} value
 * @param {number} [depth=0]
 * @returns {any}
 */
export function scrubDeep(value, depth = 0) {
  if (depth > 6 || !value) return value;

  if (typeof value === "string") {
    return scrubText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, depth + 1));
  }

  if (typeof value === "object") {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      const lowerKey = k.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token") ||
        lowerKey.includes("cookie") ||
        lowerKey.includes("authorization")
      ) {
        cleaned[k] = "[REDACTED]";
      } else if (lowerKey.includes("email")) {
        cleaned[k] = "[REDACTED_EMAIL]";
      } else {
        cleaned[k] = scrubDeep(v, depth + 1);
      }
    }
    return cleaned;
  }

  return value;
}

/**
 * Sentry beforeSend hook to sanitize all event data before network transmission.
 * @param {any} event
 * @returns {any}
 */
export function scrubSentryEvent(event) {
  if (!event) return null;

  // 1. Scrub user object — discard personal identifiers, keep only anonymous id
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.name;
    delete event.user.ip_address;
  }

  // 2. Scrub request URL and headers
  if (event.request) {
    if (event.request.url) {
      event.request.url = scrubText(event.request.url);
    }
    if (event.request.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-webhook-secret"];
    }
    if (event.request.data) {
      event.request.data = scrubDeep(event.request.data);
    }
  }

  // 3. Scrub breadcrumbs
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      if (b.message) b.message = scrubText(b.message);
      if (b.data) b.data = scrubDeep(b.data);
      return b;
    });
  }

  // 4. Scrub exception messages & values
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((v) => {
      if (v.value) v.value = scrubText(v.value);
      return v;
    });
  }

  // 5. Scrub top-level message
  if (event.message) {
    event.message = scrubText(event.message);
  }

  // 6. Scrub extra context
  if (event.extra) {
    event.extra = scrubDeep(event.extra);
  }

  return event;
}
