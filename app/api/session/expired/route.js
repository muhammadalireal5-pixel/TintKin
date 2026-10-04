import { NextResponse } from "next/server";
import { signOut } from "@/auth";
import { connectDb } from "@/app/lib/mongoose";
import { getAuthenticatedUser, findSessionUser } from "@/app/lib/auth-server";

// Clears a revoked/orphaned session cookie, then sends the user to sign in.
// A still-valid session is left alone, so this can't be used to force-logout
// someone through a crafted link.
export async function GET(request) {
  let stillValid = false;
  try {
    const decoded = await getAuthenticatedUser();
    await connectDb();
    stillValid = Boolean(await findSessionUser(decoded));
  } catch {
    stillValid = false;
  }

  if (stillValid) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  await signOut({ redirectTo: "/sign-in?notice=session_expired" });
}
