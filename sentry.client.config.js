import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./lib/utils/pii-scrubber";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  // Only send in production or if explicitly configured
  enabled: process.env.NODE_ENV === "production" || Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Trace 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Scrub all personal data before sending
  beforeSend(event) {
    return scrubSentryEvent(event);
  },

  // Don't send PII
  sendDefaultPii: false,
});
