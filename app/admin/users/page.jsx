import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { fetchAdminData } from "@/lib/services/admin-users";
import AdminDashboard from "../AdminDashboard";
import AdminShell from "../AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Users | TintKin Admin",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const readOnly = session.role !== "owner";
  const { users, stats } = await fetchAdminData({ masked: readOnly });

  return (
    <AdminShell current="users" session={session}>
      <AdminDashboard initialUsers={users} initialStats={stats} readOnly={readOnly} />
    </AdminShell>
  );
}
