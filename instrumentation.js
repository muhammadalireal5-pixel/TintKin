import * as Sentry from "@sentry/nextjs";

// Reports errors thrown in Server Components, route handlers and server actions
// (otherwise never captured). No-op when Sentry isn't initialised.
export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  // Sentry.init() runs regardless of whether a DSN is configured — with
  // none set it just silently never sends anything, no warning anywhere.
  // Surface that loudly in server logs instead of discovering it only when
  // a tester hits a bug nobody got notified about.
  if (process.env.NODE_ENV === "production" && !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn("[Sentry] No SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN set in production — error monitoring is configured but has nowhere to send events.");
  }
}
