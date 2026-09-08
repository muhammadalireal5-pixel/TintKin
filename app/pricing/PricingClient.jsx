"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserTier } from "@/app/lib/actions";
import { Check, Sparkles, Star, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import { TIERS, STANDARD_PACING } from "@/lib/constants/tiers";

export default function PricingClient() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showStandardModal, setShowStandardModal] = useState(false);
    const [activeTab, setActiveTab] = useState(TIERS.STANDARD); // for mobile view: 'free' | 'standard' | 'premium'

    const handleSelectPlan = async (tier) => {
        if (tier === TIERS.STANDARD) {
            setShowStandardModal(true);
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
        setLoading(true);
        setShowStandardModal(false);
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
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex justify-center mb-8 tk-anim-1">
                <div className="inline-flex bg-white/70 p-1 rounded-2xl border border-lavender shadow-sm">
                    <button
                        onClick={() => setActiveTab(TIERS.FREE)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            activeTab === TIERS.FREE
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted hover:text-primary"
                        }`}
                    >
                        Free
                    </button>
                    <button
                        onClick={() => setActiveTab(TIERS.STANDARD)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                            activeTab === TIERS.STANDARD
                                ? "bg-sage text-white shadow-sm"
                                : "text-muted hover:text-primary"
                        }`}
                    >
                        Standard
                        <span className="ml-1 text-[9px] uppercase px-1.5 py-0.2 bg-white/20 rounded-full font-bold">Pop</span>
                    </button>
                    <button
                        onClick={() => setActiveTab(TIERS.PREMIUM)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                            activeTab === TIERS.PREMIUM
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted hover:text-primary"
                        }`}
                    >
                        Pro
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                
                {/* Free Plan */}
                <div className={`tk-glass p-6 sm:p-8 rounded-3xl flex flex-col tk-anim-2 hover:shadow-xl transition-all ${
                    activeTab !== TIERS.FREE ? "hidden md:flex" : "flex"
                }`}>
                    <div className="mb-6">
                        <h3 className="text-2xl font-display text-primary mb-2">Free</h3>
                        <p className="text-muted text-sm min-h-[40px]">A taste of TintKin&apos;s AI analysis.</p>
                    </div>
                    <div className="mb-8">
                        <span className="text-4xl font-display text-primary">$0</span>
                        <span className="text-muted">/mo</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span><strong>2 Scans</strong> per month</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span><strong>1 AI Simulation</strong> per month</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span>Basic insights & logging</span>
                        </li>
                    </ul>
                    <button 
                        onClick={() => handleSelectPlan(TIERS.FREE)}
                        disabled={loading}
                        className="tk-pill-btn w-full bg-white/50 border border-lavender hover:bg-white transition-colors"
                    >
                        Select Free
                    </button>
                </div>

                {/* Standard Plan */}
                <div className={`tk-glass p-6 sm:p-8 rounded-3xl flex flex-col tk-anim-3 relative hover:shadow-xl transition-all border-sage/30 bg-white/50 ${
                    activeTab !== TIERS.STANDARD ? "hidden md:flex" : "flex"
                }`}>
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-2 sm:translate-x-4">
                        <div className="bg-sage text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 py-1 rounded-full shadow-lg">
                            Popular
                        </div>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-2xl font-display text-primary mb-2">Standard</h3>
                        <p className="text-muted text-sm min-h-[40px]">Perfect for tracking progress every other day.</p>
                    </div>
                    <div className="mb-8">
                        <span className="text-4xl font-display text-primary">$12</span>
                        <span className="text-muted">/mo</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span><strong>15 Scans</strong> per month</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span><strong>3 AI Simulations</strong> per month</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span>Advanced routine tracking</span>
                        </li>
                    </ul>
                    <button 
                        onClick={() => handleSelectPlan(TIERS.STANDARD)}
                        disabled={loading}
                        className="tk-pill-btn w-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg"
                    >
                        Select Standard
                    </button>
                </div>

                {/* Pro Plan */}
                <div className={`tk-glass p-6 sm:p-8 rounded-3xl flex flex-col tk-anim-4 hover:shadow-xl transition-all ${
                    activeTab !== TIERS.PREMIUM ? "hidden md:flex" : "flex"
                }`}>
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-2xl font-display text-primary">Pro</h3>
                            <Star className="w-5 h-5 text-orange-400 fill-orange-400" />
                        </div>
                        <p className="text-muted text-sm min-h-[40px]">For the dedicated skincare enthusiast.</p>
                    </div>
                    <div className="mb-8">
                        <span className="text-4xl font-display text-primary">$24</span>
                        <span className="text-muted">/mo</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span><strong>Daily Scans</strong> (Full Month)</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Check className="w-5 h-5 text-sage shrink-0" />
                            <span><strong>4 AI Simulations</strong> per month</span>
                        </li>
                        <li className="flex items-start gap-3 text-sm text-primary">
                            <Sparkles className="w-5 h-5 text-orange-400 shrink-0" />
                            <span><strong>Custom Product Uploads</strong> in Simulator</span>
                        </li>
                    </ul>
                    <button 
                        onClick={() => handleSelectPlan(TIERS.PREMIUM)}
                        disabled={loading}
                        className="tk-pill-btn w-full bg-white/50 border border-lavender hover:bg-white transition-colors"
                    >
                        Select Pro
                    </button>
                </div>
            </div>

            {/* Sticky Mobile CTA */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-base/90 backdrop-blur-md border-t border-black/5 z-40 pb-safe">
                {activeTab === TIERS.FREE && (
                    <button
                        onClick={() => handleSelectPlan(TIERS.FREE)}
                        disabled={loading}
                        className="tk-pill-btn w-full bg-white/90 border border-lavender text-primary shadow-lg flex items-center justify-center gap-2 text-sm font-semibold hover:bg-white"
                    >
                        Select Free Plan — $0/mo
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
                {activeTab === TIERS.STANDARD && (
                    <button
                        onClick={() => handleSelectPlan(TIERS.STANDARD)}
                        disabled={loading}
                        className="tk-pill-btn tk-btn-primary w-full shadow-lg flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                        Get Standard Plan — $12/mo
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
                {activeTab === TIERS.PREMIUM && (
                    <button
                        onClick={() => handleSelectPlan(TIERS.PREMIUM)}
                        disabled={loading}
                        className="tk-pill-btn bg-primary text-white w-full shadow-lg flex items-center justify-center gap-2 text-sm font-semibold hover:bg-primary/90"
                    >
                        Get Pro Plan — $24/mo
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-sage mb-4" />
                    <p className="text-primary font-medium">Setting up your plan...</p>
                </div>
            )}

            {/* Standard Frequency Modal */}
            {showStandardModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="tk-glass bg-white max-w-md w-full rounded-3xl p-5 sm:p-8 border border-white/50 shadow-2xl relative animate-scale-up">
                        <h2 className="text-2xl font-display font-medium text-primary mb-2">Choose your rhythm</h2>
                        <p className="text-muted text-sm mb-6">
                            With the Standard plan, you get 15 scans per month. How would you like to pace them? 
                            (You can always change this in your Settings later)
                        </p>

                        <div className="space-y-4">
                            <button 
                                onClick={() => handleStandardFrequency(STANDARD_PACING.EVERY_OTHER_DAY)}
                                className="w-full text-left p-4 rounded-2xl border-2 border-sage/50 bg-sage/5 hover:bg-sage/10 transition-colors relative group"
                            >
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-2">
                                    <span className="bg-sage text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                        Recommended
                                    </span>
                                </div>
                                <h4 className="font-semibold text-primary mb-1 flex items-center gap-2">
                                    Strict Every Other Day
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-sage" />
                                </h4>
                                <p className="text-sm text-muted">
                                    Enforce a 48-hour gap between scans. Best for completing a consistent 30-day cycle without burning through scans too fast.
                                </p>
                            </button>

                            <button 
                                onClick={() => handleStandardFrequency(STANDARD_PACING.FLEXIBLE)}
                                className="w-full text-left p-4 rounded-2xl border border-lavender hover:bg-black/5 transition-colors group"
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
                            className="mt-6 w-full py-2 text-sm font-medium text-muted hover:text-primary transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
