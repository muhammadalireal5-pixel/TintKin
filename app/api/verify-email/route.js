import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/app/lib/auth-actions";

// GET so the link in the confirmation email is a plain click; the token is
// single-use (the matching document is updated atomically, see
// verifyEmailToken) so a mail scanner that preloads the link just burns it.
export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");
  const result = await verifyEmailToken(token);

  // Not /dashboard: the link is opened from an email, often in a session-less
  // context (different browser/device), and /sign-in renders the same notice
  // regardless of auth state instead of bouncing through the login redirect.
  const redirectUrl = new URL("/sign-in", request.url);
  redirectUrl.searchParams.set("notice", result.success ? "email_verified" : "email_verify_failed");
  return NextResponse.redirect(redirectUrl);
}
