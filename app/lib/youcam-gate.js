import "server-only";
import * as Sentry from "@sentry/nextjs";
import { connectDb, RateLimit } from "./mongoose";
import { checkRateLimit, getWindowStart } from "./rate-limit";
import { youcamHooks } from "./youcam";

export const YOUCAM_BUDGET = {
  perWindow: 230,
  windowMs: 300000,
  perSecond: 4,
  breakerErrors: 8,
  breakerWindowMs: 60000,
};

const GLOBAL = "global:youcam";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function busyError() {
  const err = new Error("YouCam is busy right now. Please try again in a minute — this didn't use a scan.");
  err.isUserFacing = true;
  err.isRateLimited = true;
  return err;
}

async function takeToken(deadline) {
  for (;;) {
    const second = await checkRateLimit(GLOBAL, "youcam_second", YOUCAM_BUDGET.perSecond, 1000);
    if (second.allowed) {
      const window = await checkRateLimit(GLOBAL, "youcam_window", YOUCAM_BUDGET.perWindow, YOUCAM_BUDGET.windowMs);
      if (window.allowed) return;
      const wait = (window.retryAfter ?? 5) * 1000;
      if (Date.now() + wait >= deadline) throw busyError();
      await sleep(wait);
      continue;
    }
    if (Date.now() + 1100 >= deadline) throw busyError();
    await sleep(250 + Math.floor(Math.random() * 500));
  }
}

export async function youcamBreakerOpen() {
  try {
    await connectDb();
    const windowStart = new Date(getWindowStart(Date.now(), YOUCAM_BUDGET.breakerWindowMs));
    const doc = await RateLimit.findOne({ identifier: GLOBAL, action: "youcam_errors", windowStart }).select("count").lean();
    return (doc?.count ?? 0) >= YOUCAM_BUDGET.breakerErrors;
  } catch {
    return false;
  }
}

youcamHooks.beforeRequest = takeToken;
youcamHooks.onResult = (ok) => {
  if (ok) return;
  checkRateLimit(GLOBAL, "youcam_errors", Number.MAX_SAFE_INTEGER, YOUCAM_BUDGET.breakerWindowMs).catch((err) =>
    Sentry.captureException(err, { tags: { scope: "youcam-breaker" } })
  );
};
