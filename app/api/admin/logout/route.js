import { adminLogout } from "@/app/lib/admin-auth";

export async function POST() {
  await adminLogout();
  return Response.json({ success: true });
}
