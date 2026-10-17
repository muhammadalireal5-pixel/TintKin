"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import PageHeader from "@/app/components/ui/PageHeader";
import { useToast } from "@/app/components/ToastProvider";
import { CREDIT_COST } from "@/lib/constants/credits";

function conversionLine(credits) {
    const scans = Math.floor(credits / CREDIT_COST.scan);
    const sims = Math.floor(credits / CREDIT_COST.simulation);
    return `Good for about ${scans} scans or ${sims} simulations.`;
}

// Owns its own buy handler/loading state so the navigation side effect isn't
// a callback closed over inside the parent's list .map() (the React Compiler
// flags mutating window.location from a render-time list callback).
function CreditPackCard({ pack }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleBuy = () => {
        setIsLoading(true);
        window.location.href = `/api/checkout/credits?productId=${pack.polarProductId}`;
    };

    return (
        <div className="tk-card p-4 sm:p-5 flex flex-col gap-3 tk-anim-2">
            <div className="tk-icon-circle w-11 h-11">
                <ShoppingBag size={20} className="text-accent" />
            </div>
            <div className="flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-primary leading-snug">{pack.label}</h2>
                <p className="text-xs sm:text-sm text-muted mt-0.5">{pack.description || conversionLine(pack.credits)}</p>
            </div>
            <button
                onClick={handleBuy}
                disabled={!pack.polarProductId || isLoading}
                className="tk-pill-btn tk-btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? "Redirecting…" : <>Buy <ArrowRight size={16} /></>}
            </button>
        </div>
    );
}

function CustomAmountCard({ pricePerCreditCents, minCustomCredits, maxCustomCredits }) {
    const [credits, setCredits] = useState(minCustomCredits);
    const [isLoading, setIsLoading] = useState(false);

    const clamp = (n) => {
        if (!Number.isFinite(n)) return minCustomCredits;
        return Math.min(maxCustomCredits, Math.max(minCustomCredits, Math.round(n)));
    };

    const priceCents = Math.round(credits * pricePerCreditCents);

    const handleBuy = () => {
        setIsLoading(true);
        window.location.href = `/api/checkout/credits/custom?credits=${credits}`;
    };

    return (
        <div className="tk-card p-5 sm:p-6 tk-anim-2 border-2 border-dashed border-accent/30 col-span-2 md:col-span-3 lg:col-span-4">
            <div className="flex items-center gap-4 mb-5">
                <div className="tk-icon-circle w-11 h-11 shrink-0">
                    <Sparkles size={20} className="text-accent" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-primary">Custom Amount</h2>
                    <p className="text-sm text-muted">Pick exactly how many credits you need.</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                    <input
                        type="number"
                        min={minCustomCredits}
                        max={maxCustomCredits}
                        step={1}
                        value={credits}
                        onChange={(e) => setCredits(clamp(Number(e.target.value)))}
                        className="w-24 px-3 py-2 rounded-xl tk-input text-center font-medium"
                    />
                    <span className="text-sm text-muted">credits</span>
                </div>
                <p className="text-sm text-muted flex-1">
                    {conversionLine(credits)} ~${(priceCents / 100).toFixed(2)}
                </p>
                <button
                    onClick={handleBuy}
                    disabled={isLoading}
                    className="tk-pill-btn tk-btn-primary shrink-0 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Redirecting…" : <>Buy <ArrowRight size={16} /></>}
                </button>
            </div>
            <p className="text-xs text-muted mt-3">
                {minCustomCredits}–{maxCustomCredits} credits per purchase. Final price is confirmed at checkout.
            </p>
        </div>
    );
}

export default function ShopClient({ creditBalance, packs, pricePerCreditCents, minCustomCredits, maxCustomCredits, customPurchaseEnabled }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();

    useEffect(() => {
        if (searchParams.get("error") === "checkout_failed") {
            showToast({ type: 'error', title: 'Checkout failed', message: "Couldn't start checkout. Please try again." });
            router.replace("/shop");
        } else if (searchParams.get("purchased") === "1") {
            showToast({ type: 'success', title: 'Credits added', message: "Your credit balance has been topped up." });
            router.replace("/shop");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasAnything = packs.length > 0 || customPurchaseEnabled;

    return (
        <div className="tk-container py-6 sm:py-10">
            <PageHeader
                eyebrow="Need more scans or simulations?"
                title="Credit Shop"
                subtitle={`Credits top up your plan's monthly allowance — ${CREDIT_COST.scan} credits per scan, ${CREDIT_COST.simulation} per simulation. Available on every plan, including Free.`}
            />

            <div className="tk-card p-4 sm:p-5 mb-5 flex items-center justify-between tk-anim-1">
                <span className="tk-eyebrow">Your balance</span>
                <span className="text-2xl font-semibold text-accent">{creditBalance} <span className="text-sm text-muted font-medium">credits</span></span>
            </div>

            {hasAnything ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {packs.map((pack) => (
                        <CreditPackCard key={pack.id} pack={pack} />
                    ))}
                    {customPurchaseEnabled && (
                        <CustomAmountCard
                            pricePerCreditCents={pricePerCreditCents}
                            minCustomCredits={minCustomCredits}
                            maxCustomCredits={maxCustomCredits}
                        />
                    )}
                </div>
            ) : (
                <p className="text-center text-sm text-muted">The shop isn&apos;t set up yet — check back soon.</p>
            )}
        </div>
    );
}
