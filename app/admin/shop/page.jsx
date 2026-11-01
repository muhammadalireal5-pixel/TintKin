import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/app/lib/admin-auth";
import { adminListShopItems } from "@/app/lib/shop-actions";
import ShopManager from "./ShopManager";
import AdminShell from "../AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const session = await verifyAdminSession();
  if (!session) redirect("/admin/login");

  const data = await adminListShopItems();

  return (
    <AdminShell current="shop" session={session}>
        <ShopManager
          initialPacks={data.success ? data.packs : []}
          initialSettings={data.success ? data.settings : null}
          loadError={data.success ? null : data.error}
          readOnly={session.role !== "owner"}
        />
    </AdminShell>
  );
}
