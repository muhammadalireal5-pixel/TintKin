import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createCheckouts } from "@polar-sh/sdk/2026-10/services/checkouts";
import { connectDb } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { ACTIVE_SUBSCRIPTION_TIERS, TIER_PRODUCT_IDS } from "@/lib/constants/tiers";
import { getPolarClient } from "@/lib/utils/polar";

// The pricing page links here as /api/checkout?tier=standard|premium instead
// of calling Polar directly, so we can attach the signed-in user before
// handing off to Polar's checkout.
export async function GET(request) {
  const tier = request.nextUrl.searchParams.get("tier");
  const productId = ACTIVE_SUBSCRIPTION_TIERS.includes(tier) ? TIER_PRODUCT_IDS[tier] : null;

  if (!productId || !process.env.POLAR_ACCESS_TOKEN) {
    // Don't tell the customer *why* — "billing isn't configured" is an
    // internal deployment detail, not something a shopper should see.
    if (ACTIVE_SUBSCRIPTION_TIERS.includes(tier)) {
      Sentry.captureMessage(`Missing product id or access token for tier "${tier}"`, { tags: { scope: "polar-checkout" } });
    }
    return NextResponse.redirect(new URL("/pricing?error=checkout_failed", request.url));
  }

  await connectDb();
  let user = null;
  try {
    user = await findSessionUser(await getAuthenticatedUser());
  } catch {
    user = null;
  }
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?next=/pricing", request.url));
  }

  // external_customer_id ties the Polar customer back to our Mongo user, so
  // the webhook can find them again without us keeping our own id mapping.
  const successUrl = new URL("/dashboard", request.url);
  successUrl.searchParams.set("checkout_id", "{CHECKOUT_ID}");

  const polar = getPolarClient();

  try {
    const checkout = await createCheckouts(polar)({
      products: [productId],
      external_customer_id: user._id.toString(),
      customer_email: user.email,
      success_url: successUrl.toString().replace("%7BCHECKOUT_ID%7D", "{CHECKOUT_ID}"),
    });
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    Sentry.captureException(error, { tags: { scope: "polar-checkout" } });
    return NextResponse.redirect(new URL("/pricing?error=checkout_failed", request.url));
  }
}
