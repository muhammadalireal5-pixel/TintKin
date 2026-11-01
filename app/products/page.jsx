import PageHeader from "@/app/components/ui/PageHeader";
import { getProductChecks } from "@/app/lib/product-actions";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Product Check",
    description: "Check any skincare product against your plan: what it does, how it fits your goals and what to watch for.",
    robots: { index: false, follow: false },
};

export default async function ProductsPage() {
    const res = await getProductChecks();
    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <PageHeader title="Product check" subtitle="Paste an ingredient list or snap the label. We match it against your plan." />
            <ProductsClient initialChecks={res.checks} initialQuota={res.quota} />
        </div>
    );
}
