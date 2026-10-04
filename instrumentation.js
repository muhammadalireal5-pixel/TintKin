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
}
