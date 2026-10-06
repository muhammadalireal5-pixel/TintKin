import { NextResponse } from "next/server";
import { createPolarCore } from "@polar-sh/sdk/2026-10";
import { createCheckouts } from "@polar-sh/sdk/2026-10/services/checkouts";
import { connectDb } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";
import { TIERS, ACTIVE_SUBSCRIPTION_TIERS } from "@/lib/constants/tiers";

// Maps a paid tier to its Polar product id. The pricing page links here as
// /api/checkout?tier=standard|premium instead of calling Polar directly, so
// we can attach the signed-in user before handing off to Polar's checkout.
const PRODUCT_IDS = {
  [TIERS.STANDARD]: process.env.POLAR_PRODUCT_ID_STANDARD,
  [TIERS.PREMIUM]: process.env.POLAR_PRODUCT_ID_PREMIUM,
};

export async function GET(request) {
  const tier = request.nextUrl.searchParams.get("tier");
  const productId = ACTIVE_SUBSCRIPTION_TIERS.includes(tier) ? PRODUCT_IDS[tier] : null;

  if (!productId || !process.env.POLAR_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Billing is not configured for this plan" }, { status: 503 });
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

  const polar = createPolarCore({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    environment: process.env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
  });

  try {
    const checkout = await createCheckouts(polar)({
      products: [productId],
      external_customer_id: user._id.toString(),
      customer_email: user.email,
      success_url: successUrl.toString().replace("%7BCHECKOUT_ID%7D", "{CHECKOUT_ID}"),
    });
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    console.error("[POLAR_CHECKOUT]", error);
    return NextResponse.redirect(new URL("/pricing?error=checkout_failed", request.url));
  }
}
