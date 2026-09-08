import { verifyAdminSession } from "@/app/lib/admin-auth";
import { fetchAdminData } from "@/lib/services/admin-users";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { users, stats } = await fetchAdminData();
    return Response.json({ success: true, users, stats });
  } catch {
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
