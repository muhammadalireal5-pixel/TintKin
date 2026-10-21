"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateUserTier, updateUserSettings } from "@/app/lib/actions";
import { Check, Minus, Sparkles, Loader2, ArrowRight } from "lucide-react";
import SegmentedTabs from "@/app/components/ui/SegmentedTabs";
import { useToast } from "@/app/components/ToastProvider";
import AnimatedModal from "@/app/components/AnimatedModal";
import { usePwaInstall } from "@/app/context/PwaContext";
import { TIERS, STANDARD_PACING } from "@/lib/constants/tiers";

const PLANS = [
    {
        tier: TIERS.FREE,
        name: "Free",
        price: "$0",
        tagline: "A taste of TintKin's AI analysis.",
        features: [
            { text: "2 Scans", rest: " per month" },
            { text: "1 AI Simulation", rest: " per month" },
            { text: "Basic insights & logging" },
        ],
        cta: "Select Free",
    },
    {
        tier: TIERS.STANDARD,
        name: "Standard",
        price: "$12",
        tagline: "Perfect for tracking progress every other day.",
        popular: true,
        features: [
            { text: "15 Scans", rest: " per month" },
            { text: "3 AI Simulations", rest: " per month" },
            { text: "Advanced routine tracking" },
        ],
        cta: "Select Standard",
    },
    {
        tier: TIERS.PREMIUM,
        name: "Pro",
        price: "$24",
        tagline: "For the dedicated skincare enthusiast.",
        features: [
            { text: "Daily Scans", rest: " (Full Month)" },
            { text: "4 AI Simulations", rest: " per month" },
            { text: "Custom Product Uploads", rest: " in Simulator", sparkle: true },
        ],
        cta: "Select Pro",
    },
];

const COMPARE_ROWS = [
    { label: "Scans per month", values: ["2", "15", "Daily"] },
    { label: "AI simulations per month", values: ["1", "3", "4"] },
    { label: "Custom product uploads in Simulator", values: [false, false, true] },
];

function CompareCell({ value }) {
    if (value === true) return <Check className="w-5 h-5 text-accent mx-auto" aria-label="Included" />;
    if (value === false) return <Minus className="w-5 h-5 text-faint mx-auto" aria-label="Not included" />;
    return <span className="text-sm font-semibold text-primary">{value}</span>;
}

export default function PricingClient({ demoMode = false }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { isInstalled } = usePwaInstall();
    const [loading, setLoading] = useState(false);
    const [showStandardModal, setShowStandardModal] = useState(false);
    const [activeTab, setActiveTab] = useState(TIERS.STANDARD); // selected plan (also drives the phone tab view)

    useEffect(() => {
        if (searchParams.get("error") === "checkout_failed") {
            showToast({ type: 'error', title: 'Checkout failed', message: "Couldn't start checkout. Please try again." });
            router.replace("/pricing");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goToCheckout = (tier) => {
        const url = `/api/checkout?tier=${tier}`;
        // An installed Android PWA's standalone window can fail to follow
        // the eventual redirect out to Polar's checkout domain cleanly —
        // open it in the regular browser instead of navigating the app's
        // own window away. Same-tab navigation is unaffected everywhere else.
        if (isInstalled) {
            window.open(url, "_blank", "noopener,noreferrer");
            // Unlike the same-window case, this tab never navigates away —
            // clear the loading overlay instead of leaving it stuck.
            setLoading(false);
        } else {
            window.location.assign(url);
        }
    };

    const handleSelectPlan = async (tier) => {
        if (tier === TIERS.STANDARD) {
            setShowStandardModal(true);
            return;
        }

        if (tier !== TIERS.FREE && !demoMode) {
            setLoading(true);
            goToCheckout(tier);
            return;
        }

        setLoading(true);
        const res = await updateUserTier(tier);
        if (res.success) {
            router.push("/capture");
        } else {
            showToast({ type: 'error', title: 'Error', message: res.error || "Failed to select plan. Please try again." });
            setLoading(false);
        }
    };

    const handleStandardFrequency = async (frequency) => {
        setShowStandardModal(false);

        if (!demoMode) {
            setLoading(true);
            // Pacing is purely a local preference; save it, then hand off to
            // Polar for the actual subscription (the webhook sets the tier).
            await updateUserSettings({ standardPlanFrequency: frequency });
            goToCheckout(TIERS.STANDARD);
            return;
        }

        setLoading(true);
        const res = await updateUserTier(TIERS.STANDARD, frequency);
        if (res.success) {
            router.push("/capture");
        } else {
            showToast({ type: 'error', title: 'Error', message: res.error || "Failed to select plan. Please try again." });
            setLoading(false);
        }
    };

    return (
        <>
            {/* Phone plan switcher */}
            <div className="md:hidden mb-5 tk-anim-1">
                <SegmentedTabs
                    label="Plan"
                    value={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { id: TIERS.FREE, label: "Free" },
                        { id: TIERS.STANDARD, label: "Standard" },
                        { id: TIERS.PREMIUM, label: "Pro" },
                    ]}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
                {PLANS.map((plan) => {
                    const selected = activeTab === plan.tier;
                    return (
                        <div
                            key={plan.tier}
                            onClick={() => setActiveTab(plan.tier)}
                            className={`tk-card relative p-5 sm:p-6 flex-col transition-all border-2 ${
                                selected ? "border-accent bg-accent-soft/50" : "border-transparent"
                            } ${selected ? "flex" : "hidden md:flex"}`}
                        >
                            {plan.popular && (
                                <span className="tk-chip absolute top-4 right-4 bg-accent text-white">Most Popular</span>
                            )}
                            <h3 className="text-xl font-semibold text-primary mb-1">{plan.name}</h3>
                            <p className="text-muted text-sm min-h-[40px] pr-24 md:pr-0">{plan.tagline}</p>
                            <div className="my-5">
                                <span className="text-4xl font-semibold text-primary">{plan.price}</span>
                                <span className="text-muted text-sm"> / month</span>
                            </div>
                            <ul className="space-y-3 mb-6 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f.text} className="flex items-start gap-3 text-sm text-primary">
                                        {f.sparkle ? (
                                            <Sparkles className="w-5 h-5 text-accent shrink-0" />
                                        ) : (
                                            <Check className="w-5 h-5 text-accent shrink-0" />
                                        )}
                                        <span><strong>{f.text}</strong>{f.rest}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSelectPlan(plan.tier); }}
                                disabled={loading}
                                className={`tk-pill-btn w-full disabled:opacity-60 ${selected ? "tk-btn-primary" : "tk-btn-soft"}`}
                            >
                                {selected ? (plan.tier === TIERS.FREE ? "Get started" : "Continue") : plan.cta}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Compare plans */}
            <section className="mt-10" aria-labelledby="compare-plans-heading">
                <h2 id="compare-plans-heading" className="text-xl font-semibold text-primary mb-4 text-center">Compare plans</h2>
                <div className="tk-card overflow-x-auto max-h-[32rem] overflow-y-auto">
                    <table className="w-full min-w-[30rem] text-left border-collapse">
                        <thead>
                            <tr>
                                <th scope="col" className="sticky top-0 z-10 bg-surface p-4 text-xs font-semibold uppercase tracking-wider text-muted border-b border-line">Features</th>
                                {PLANS.map((p) => (
                                    <th key={p.tier} scope="col" className="sticky top-0 z-10 bg-surface p-4 text-center text-sm font-semibold text-primary border-b border-line">
                                        {p.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARE_ROWS.map((row) => (
                                <tr key={row.label} className="border-b border-line">
                                    <th scope="row" className="p-4 text-sm font-medium text-primary">{row.label}</th>
                                    {row.values.map((v, i) => (
                                        <td key={i} className="p-4 text-center"><CompareCell value={v} /></td>
                                    ))}
                                </tr>
                            ))}
                            <tr>
                                <th scope="row" className="p-4 text-sm font-semibold text-primary">Price</th>
                                {PLANS.map((p) => (
                                    <td key={p.tier} className="p-4 text-center text-sm font-semibold text-primary">{p.price} / mo</td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-cocoa/45" role="status" aria-live="polite">
                    <div className="tk-card flex flex-col items-center gap-3 rounded-3xl px-8 py-7">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <p className="text-primary font-medium text-sm">Setting up your plan...</p>
                    </div>
                </div>
            )}

                        {/* Standard Frequency Modal */}
            <AnimatedModal
                isOpen={showStandardModal}
                onClose={() => setShowStandardModal(false)}
                zIndex={60}
                ariaLabel="Choose your rhythm"
                panelClassName="p-6 pt-8 sm:p-8"
            >
                        <h2 className="text-2xl font-semibold text-primary mb-2">Choose your rhythm</h2>
                        <p className="text-muted text-sm mb-6">
                            With the Standard plan, you get 15 scans per month. How would you like to pace them? 
                            (You can always change this in your Settings later)
                        </p>

                        <div className="space-y-4">
                            <button 
                                onClick={() => handleStandardFrequency(STANDARD_PACING.EVERY_OTHER_DAY)}
                                className="w-full text-left p-4 rounded-2xl border-2 border-accent bg-accent-soft/50 hover:bg-accent-soft transition-colors relative group"
                            >
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-2">
                                    <span className="bg-accent text-white tk-text-micro font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        Recommended
                                    </span>
                                </div>
                                <h4 className="font-semibold text-primary mb-1 flex items-center gap-2">
                                    Strict Every Other Day
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                                </h4>
                                <p className="text-sm text-muted">
                                    Enforce a 48-hour gap between scans. Best for completing a consistent 30-day cycle without burning through scans too fast.
                                </p>
                            </button>

                            <button 
                                onClick={() => handleStandardFrequency(STANDARD_PACING.FLEXIBLE)}
                                className="w-full text-left p-4 rounded-2xl border border-line bg-white hover:bg-blush transition-colors group"
                            >
                                <h4 className="font-semibold text-primary mb-1 flex items-center gap-2">
                                    Flexible (Any Day)
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-sm text-muted">
                                    Use your 15 scans whenever you want (up to 1 per day). Careful not to use them all at the beginning of the month!
                                </p>
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setShowStandardModal(false)}
                            className="mt-4 sm:mt-6 w-full py-3 sm:py-2 text-sm font-medium text-muted hover:text-primary transition-colors"
                        >
                            Cancel
                        </button>
            </AnimatedModal>
        </>
    );
}
