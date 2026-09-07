"use client";

import { useState } from "react";
import { Sparkles, Check, ChevronRight, Crown } from "lucide-react";
import { requestUpgrade } from "@/app/lib/actions";

export default function UpgradePage() {
  const [loading, setLoading] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async (tier) => {
    setLoading(tier);
    setError("");
    try {
      const res = await requestUpgrade(tier);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Upgrade failed.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto py-16 px-4 text-center w-full">
        <div className="w-20 h-20 bg-sage/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-sage" />
        </div>
        <h1 className="text-3xl font-display font-medium text-primary mb-4">Request Received!</h1>
        <p className="text-muted mb-8">
          Your upgrade request is currently pending. An admin will process it shortly.
        </p>
        <a href="/dashboard" className="px-6 py-3 bg-primary text-white rounded-xl font-medium inline-block hover:bg-primary/90 transition">
          Return to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto py-10 px-4 w-full">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-display font-medium text-primary mb-4">Upgrade Your Skincare Journey</h1>
        <p className="text-muted text-lg max-w-2xl mx-auto">Get more out of TintKin with our premium tiers.</p>
        {error && <p className="text-red-500 mt-4 bg-red-50 p-3 rounded-lg inline-block">{error}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Standard Tier */}
        <div className="tk-glass rounded-3xl p-8 border border-white/40 flex flex-col relative overflow-hidden">
          <h2 className="text-2xl font-display font-medium text-primary mb-2">Standard</h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-primary">$12</span>
            <span className="text-muted">/mo</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3"><Check className="w-5 h-5 text-sage shrink-0" /> <span className="text-primary">Full YouCam Analysis every other day</span></li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-sage shrink-0" /> <span className="text-primary">Max ~15 scans / month</span></li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-sage shrink-0" /> <span className="text-primary">4 Simulations / month</span></li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-sage shrink-0" /> <span className="text-primary">Daily streak tracking</span></li>
          </ul>
          <button 
            onClick={() => handleUpgrade('standard')}
            disabled={loading !== null}
            className="w-full py-4 rounded-xl bg-sage/10 text-sage font-semibold hover:bg-sage/20 transition flex justify-center items-center gap-2"
          >
            {loading === 'standard' ? "Processing..." : "Select Standard"}
          </button>
        </div>

        {/* Premium Tier */}
        <div className="tk-glass rounded-3xl p-8 border-2 border-orange-300 relative flex flex-col shadow-xl transform md:-translate-y-4">
          <div className="absolute top-0 right-0 bg-orange-300 text-white text-xs font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3 h-3" /> Most Popular
          </div>
          <h2 className="text-2xl font-display font-medium text-primary mb-2">Premium</h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-primary">$20</span>
            <span className="text-muted">/mo</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3"><Check className="w-5 h-5 text-orange-500 shrink-0" /> <span className="text-primary font-medium">Daily Full YouCam Analysis</span></li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-orange-500 shrink-0" /> <span className="text-primary">Max ~30 scans / month</span></li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-orange-500 shrink-0" /> <span className="text-primary font-medium">20 Simulations / month</span></li>
            <li className="flex gap-3"><Check className="w-5 h-5 text-orange-500 shrink-0" /> <span className="text-primary">Daily streak tracking</span></li>
          </ul>
          <button 
            onClick={() => handleUpgrade('premium')}
            disabled={loading !== null}
            className="w-full py-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition flex justify-center items-center gap-2"
          >
            {loading === 'premium' ? "Processing..." : "Select Premium"}
          </button>
        </div>
      </div>
    </div>
  );
}
