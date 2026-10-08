import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { adminListShopItems } from "@/app/lib/shop-actions";
import ShopManager from "./ShopManager";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const data = await adminListShopItems();

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#FDFBF7",
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
            <img src="/icon.png" alt="TintKin Admin Logo" style={{ width: "288px", height: "auto", objectFit: "contain", marginLeft: "-8px" }} />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                color: "var(--tk-text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              Shop
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

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <ShopManager
          initialPacks={data.success ? data.packs : []}
          initialSettings={data.success ? data.settings : null}
          loadError={data.success ? null : data.error}
        />
      </main>
    </div>
  );
}
