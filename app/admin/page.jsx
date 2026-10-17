import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { fetchAdminData } from "@/lib/services/admin-users";
import Wordmark from "@/app/components/ui/Wordmark";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const { users, stats } = await fetchAdminData();

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--tk-bg)",
          borderBottom: "1px solid var(--tk-border-solid)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Wordmark asLink={false} className="text-3xl" />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
                fontFamily: "var(--font-body, 'Outfit', system-ui, sans-serif)",
                color: "var(--tk-text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              Admin
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "var(--tk-blush)",
                color: "var(--tk-text-muted)",
                fontWeight: 500,
              }}
            >
              {session.email}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link
              href="/admin/feedback"
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--tk-border-solid)",
                borderRadius: "10px",
                color: "var(--tk-text-primary)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Feedback
            </Link>
            <Link
              href="/admin/shop"
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--tk-border-solid)",
                borderRadius: "10px",
                color: "var(--tk-text-primary)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Shop
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <AdminDashboard initialUsers={users} initialStats={stats} />
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const { adminLogout } = await import("@/app/lib/admin-auth");
        await adminLogout();
        const { redirect } = await import("next/navigation");
        redirect("/admin/login");
      }}
    >
      <button
        type="submit"
        style={{
          padding: "8px 16px",
          background: "transparent",
          border: "1px solid var(--tk-border-solid)",
          borderRadius: "10px",
          color: "var(--tk-text-primary)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "inherit",
        }}
      >
        Sign out
      </button>
    </form>
  );
}
