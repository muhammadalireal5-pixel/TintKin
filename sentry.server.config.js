import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./lib/utils/pii-scrubber";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" || Boolean(process.env.SENTRY_DSN),

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  beforeSend(event) {
    return scrubSentryEvent(event);
  },

  sendDefaultPii: false,
});
