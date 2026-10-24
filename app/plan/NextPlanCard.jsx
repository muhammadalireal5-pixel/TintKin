"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PartyPopper } from "lucide-react";
import { startNextPlanAction } from "@/app/lib/plan-actions";

/** Shown once a plan has run its 30 days: a fresh plan starts from the latest scan. */
export default function NextPlanCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await startNextPlanAction(tz);
    if (res?.success && res.created) {
      router.refresh();
    } else {
      setError(res?.error || "We couldn't start your next plan. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section className="tk-card p-5 sm:p-6 bg-accent-soft/40 border-accent/30" aria-label="Plan complete">
      <div className="flex items-start gap-3">
        <span className="tk-icon-circle w-10 h-10 bg-white shrink-0"><PartyPopper size={18} /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary">You finished your 30 days</p>
          <p className="text-sm text-muted mt-0.5">
            Take a final scan if you haven&apos;t, then start your next 30 days from where your skin is now.
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}
      <button type="button" onClick={start} disabled={busy} className="tk-pill-btn tk-btn-primary w-full mt-4 disabled:opacity-60">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Starting&hellip;</> : "Start my next 30 days"}
      </button>
    </section>
  );
}
