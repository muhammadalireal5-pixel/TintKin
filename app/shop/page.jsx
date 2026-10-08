import { Suspense } from "react";
import { getUserProfile } from "@/app/lib/actions";
import { getShopCatalog } from "@/app/lib/shop-actions";
import ShopClient from "./ShopClient";

export const metadata = {
    title: "Credit Shop",
    description: "Buy extra scans and simulations as credits — available on every plan, including Free.",
};

export default async function ShopPage() {
    const [profile, catalog] = await Promise.all([getUserProfile(), getShopCatalog()]);

    return (
        <Suspense fallback={null}>
            <ShopClient
                creditBalance={profile?.creditBalance ?? 0}
                packs={catalog.packs}
                pricePerCreditCents={catalog.pricePerCreditCents}
                minCustomCredits={catalog.minCustomCredits}
                maxCustomCredits={catalog.maxCustomCredits}
                customPurchaseEnabled={catalog.customPurchaseEnabled}
            />
        </Suspense>
    );
}
