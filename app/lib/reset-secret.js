import "server-only";

/**
 * HMAC key for the short-lived password-reset session JWT.
 * Fails loudly instead of falling back to a hardcoded string that anyone
 * reading the repo could use to forge a reset session.
 */
export function getResetSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}
