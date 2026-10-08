import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createCheckouts } from "@polar-sh/sdk/2026-10/services/checkouts";
import { connectDb } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { getOrCreateShopSettings } from "@/lib/utils/shop";
import { getPolarClient } from "@/lib/utils/polar";

// Counterpart to ../route.js for a user-chosen credit amount instead of a
// fixed pack. Checkout is created against the single unit-based "Custom
// Credits" Polar product (lib/utils/shop.js's syncPolarCustomProduct),
// passing `units` so Polar charges pricePerCreditCents * credits itself —
// we never compute or trust a client-supplied price.
export async function GET(request) {
  const creditsParam = request.nextUrl.searchParams.get("credits");
  const credits = Number(creditsParam);

  if (!process.env.POLAR_ACCESS_TOKEN || !Number.isInteger(credits) || credits < 1) {
    return NextResponse.redirect(new URL("/shop?error=checkout_failed", request.url));
  }

  await connectDb();
  const settings = await getOrCreateShopSettings();
  if (!settings.customProductPolarId) {
    Sentry.captureMessage("Custom credit purchases requested before an admin configured pricing", {
      tags: { scope: "polar-checkout-credits-custom" },
    });
    return NextResponse.redirect(new URL("/shop?error=checkout_failed", request.url));
  }
  if (credits < settings.minCustomCredits || credits > settings.maxCustomCredits) {
    return NextResponse.redirect(new URL("/shop?error=checkout_failed", request.url));
  }

  let user = null;
  try {
    user = await findSessionUser(await getAuthenticatedUser());
  } catch {
    user = null;
  }
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?next=/shop", request.url));
  }

  const successUrl = new URL("/shop", request.url);
  successUrl.searchParams.set("purchased", "1");
  successUrl.searchParams.set("checkout_id", "{CHECKOUT_ID}");

  const polar = getPolarClient();

  try {
    const checkout = await createCheckouts(polar)({
      products: [settings.customProductPolarId],
      units: credits,
      external_customer_id: user._id.toString(),
      customer_email: user.email,
      success_url: successUrl.toString().replace("%7BCHECKOUT_ID%7D", "{CHECKOUT_ID}"),
    });
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    Sentry.captureException(error, { tags: { scope: "polar-checkout-credits-custom" } });
    return NextResponse.redirect(new URL("/shop?error=checkout_failed", request.url));
  }
}
