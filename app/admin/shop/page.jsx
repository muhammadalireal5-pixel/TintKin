import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { adminListShopItems } from "@/app/lib/shop-actions";
import ShopManager from "./ShopManager";
import AdminHeader from "../AdminHeader";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const data = await adminListShopItems();

  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminHeader current="shop" />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 sm:py-6">
        <ShopManager
          initialPacks={data.success ? data.packs : []}
          initialSettings={data.success ? data.settings : null}
          loadError={data.success ? null : data.error}
        />
      </main>
    </div>
  );
}
