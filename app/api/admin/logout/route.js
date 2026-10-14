import { adminLogout, verifyAdminSession } from "@/app/lib/admin-auth";

export async function POST() {
  // adminLogout() stamps a global revocation timestamp (revokedBefore) that
  // invalidates every admin session, not just the caller's cookie — without
  // this check, any external site could force that state change via a
  // cross-origin POST to this route, logging out whoever is actually signed
  // in as admin.
  const session = await verifyAdminSession();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  await adminLogout();
  return Response.json({ success: true });
}
