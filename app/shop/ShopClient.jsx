"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
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
        <div className="tk-glass p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 tk-anim-2 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-sage/15 flex items-center justify-center shrink-0">
                    <ShoppingBag size={20} className="text-sage" />
                </div>
                <div>
                    <h2 className="text-lg font-display font-medium text-primary">{pack.label}</h2>
                    <p className="text-sm text-muted">{pack.description || conversionLine(pack.credits)}</p>
                </div>
            </div>
            <button
                onClick={handleBuy}
                disabled={!pack.polarProductId || isLoading}
                className="shrink-0 flex items-center justify-center gap-2 bg-primary text-white font-medium text-sm px-6 py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="tk-glass p-6 sm:p-8 rounded-3xl tk-anim-2 border-2 border-dashed border-sage/30">
            <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-sage/15 flex items-center justify-center shrink-0">
                    <Sparkles size={20} className="text-sage" />
                </div>
                <div>
                    <h2 className="text-lg font-display font-medium text-primary">Custom Amount</h2>
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
                        className="w-24 px-3 py-2 rounded-xl border border-[var(--tk-border-solid)] text-center font-medium bg-white/60"
                    />
                    <span className="text-sm text-muted">credits</span>
                </div>
                <p className="text-sm text-muted flex-1">
                    {conversionLine(credits)} ~${(priceCents / 100).toFixed(2)}
                </p>
                <button
                    onClick={handleBuy}
                    disabled={isLoading}
                    className="shrink-0 flex items-center justify-center gap-2 bg-primary text-white font-medium text-sm px-6 py-3 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
            <div className="max-w-3xl mx-auto relative z-10">
                <div className="text-center mb-8 sm:mb-12 tk-anim-1">
                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-sage mb-2">
                        Need More Scans Or Simulations?
                    </p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-medium text-primary mb-4">
                        Credit <span className="italic text-sage">Shop</span>
                    </h1>
                    <p className="text-muted text-sm sm:text-base max-w-xl mx-auto px-2">
                        Credits top up your plan&apos;s monthly allowance — {CREDIT_COST.scan} credits per scan, {CREDIT_COST.simulation} per simulation. Available on every plan, including Free.
                    </p>
                    <p className="text-sm font-semibold text-primary mt-4">
                        Your balance: <span className="text-sage">{creditBalance} credits</span>
                    </p>
                </div>

                {hasAnything ? (
                    <div className="grid gap-4 sm:gap-6">
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
        </div>
    );
}
