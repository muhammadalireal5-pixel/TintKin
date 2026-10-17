import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { fetchAdminData } from "@/lib/services/admin-users";
import AdminDashboard from "./AdminDashboard";
import AdminHeader from "./AdminHeader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const { users, stats } = await fetchAdminData();

  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminHeader current="users" email={session.email} />

      <main className="mx-auto max-w-[1400px]">
        <AdminDashboard initialUsers={users} initialStats={stats} />
      </main>
    </div>
  );
}
