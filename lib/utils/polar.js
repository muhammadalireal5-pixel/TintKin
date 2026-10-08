import "server-only";
import { createPolarCore } from "@polar-sh/sdk/2026-10";

/**
 * Shared Polar API client config, used by both checkout routes and the
 * subscription/refund server actions — avoids each call site re-deciding
 * sandbox-vs-production from POLAR_ENVIRONMENT independently.
 * @returns {ReturnType<typeof createPolarCore>}
 */
export function getPolarClient() {
  return createPolarCore({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    environment: process.env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
  });
}
