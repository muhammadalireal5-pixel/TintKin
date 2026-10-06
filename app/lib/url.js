import "server-only";

/**
 * Resolves the app's public base URL for absolute links (emails, redirects).
 * Vercel snapshots env vars per deployment, so NEXTAUTH_URL/AUTH_URL only take
 * effect once explicitly set *and* redeployed — easy to forget. VERCEL_URL /
 * VERCEL_PROJECT_PRODUCTION_URL are populated by Vercel automatically on every
 * deployment, so they're a safe fallback before localhost.
 */
export function getBaseUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
