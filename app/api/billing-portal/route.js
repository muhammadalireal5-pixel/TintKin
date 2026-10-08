import { CustomerPortal } from "@polar-sh/nextjs";
import { connectDb } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";

// Polar's hosted Customer Portal already covers cancellation (no-refund,
// access-until-period-end — matching our confirmed policy), payment method
// updates, and invoice history, so we don't build custom UI for any of that.
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  environment: process.env.POLAR_ENVIRONMENT === "production" ? "production" : "sandbox",
  returnUrl: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/dashboard` : undefined,
  getExternalCustomerId: async () => {
    await connectDb();
    const user = await findSessionUser(await getAuthenticatedUser());
    if (!user) throw new Error("Not signed in");
    return user._id.toString();
  },
});
