import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createCheckouts } from "@polar-sh/sdk/2026-10/services/checkouts";
import { connectDb, CreditPack } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { getPolarClient } from "@/lib/utils/polar";

// One-time-purchase counterpart to /api/checkout (subscriptions), for a
// fixed pack managed from /admin/shop. Separate route because the two differ
// enough (no tier, no recurring semantics) to not share a query-param-driven
// branch. See ./custom/route.js for the "buy a custom amount" counterpart.
export async function GET(request) {
  const productId = request.nextUrl.searchParams.get("productId");

  if (!productId || !process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.redirect(new URL("/shop?error=checkout_failed", request.url));
  }

  await connectDb();
  const pack = await CreditPack.findOne({ polarProductId: productId, active: true }).catch(() => null);
  if (!pack) {
    Sentry.captureMessage(`Unknown or inactive credit pack product id "${productId}"`, { tags: { scope: "polar-checkout-credits" } });
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
      products: [productId],
      external_customer_id: user._id.toString(),
      customer_email: user.email,
      success_url: successUrl.toString().replace("%7BCHECKOUT_ID%7D", "{CHECKOUT_ID}"),
    });
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    Sentry.captureException(error, { tags: { scope: "polar-checkout-credits" } });
    return NextResponse.redirect(new URL("/shop?error=checkout_failed", request.url));
  }
}
