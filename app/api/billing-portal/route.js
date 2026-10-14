import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createCustomerSessions } from "@polar-sh/sdk/2026-10/services/customer_sessions";
import { connectDb } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { getPolarClient } from "@/lib/utils/polar";

// Builds the Polar customer-portal session ourselves instead of using
// @polar-sh/nextjs's CustomerPortal() helper: that helper has no error hook,
// and a Polar API failure (e.g. an access token missing the scope this
// endpoint needs) came back as an uncaught `RangeError: Invalid status code`
// deep in its own response-writing path instead of a clean redirect — the
// "page is down" symptom. Same manual-call-and-redirect shape /api/checkout
// already uses successfully.
export async function GET(request) {
  await connectDb();
  let user = null;
  try {
    user = await findSessionUser(await getAuthenticatedUser());
  } catch {
    user = null;
  }
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?next=/dashboard", request.url));
  }

  const returnUrl = new URL("/dashboard", request.url).toString();
  const polar = getPolarClient();

  try {
    const session = await createCustomerSessions(polar)({
      external_customer_id: user._id.toString(),
      return_url: returnUrl,
    });
    return NextResponse.redirect(session.customer_portal_url);
  } catch (error) {
    Sentry.captureException(error, { tags: { scope: "polar-billing-portal" } });
    return NextResponse.redirect(new URL("/dashboard?error=billing_portal_failed", request.url));
  }
}
