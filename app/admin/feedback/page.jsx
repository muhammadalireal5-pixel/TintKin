import Wordmark from "@/app/components/ui/Wordmark";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { adminListFeedback } from "@/app/lib/feedback-actions";
import FeedbackManager from "./FeedbackManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback | TintKin Admin",
  robots: { index: false, follow: false },
};

export default async function AdminFeedbackPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const data = await adminListFeedback({});

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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
              Feedback
            </span>
          </div>
          <Link
            href="/admin"
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
            ← Users
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
        <FeedbackManager initial={data.success ? data : null} loadError={data.success ? null : data.error} />
      </main>
    </div>
  );
}
