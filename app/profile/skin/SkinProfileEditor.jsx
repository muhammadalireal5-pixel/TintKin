"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw, Loader2 } from "lucide-react";
import SkinQuestionnaire from "@/app/components/SkinQuestionnaire";
import { updateSkinProfile } from "@/app/lib/actions";
import { retireActivePlan } from "@/app/lib/plan-actions";

/**
 * "Update my skin profile": the same questionnaire, prefilled. After saving,
 * the person chooses whether to rebuild the plan from the new answers or keep
 * the current one (the answers still shape Kin's edits and the next plan).
 */
export default function SkinProfileEditor({ initial, hasProfile, hasPlan }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rebuild = async () => {
    setBusy(true);
    setError("");
    const res = await retireActivePlan();
    if (res?.success) {
      router.push("/welcome");
    } else {
      setError(res?.error || "We couldn't restart your plan. Please try again.");
      setBusy(false);
    }
  };

  if (saved) {
    return (
      <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
        <section className="tk-card w-full max-w-md p-6 sm:p-8 text-center tk-anim-1">
          <span className="tk-icon-circle w-14 h-14 mx-auto"><Check size={26} /></span>
          <h1 className="text-xl sm:text-2xl font-semibold text-primary mt-4">Profile updated</h1>
          <p className="text-sm text-muted mt-2">
            {hasPlan
              ? "Want a fresh 30-day plan built from your new answers? It starts again at day 1; your streak and history are kept."
              : "Your answers are saved. Let's build your plan from them."}
          </p>
          {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}
          <button type="button" onClick={rebuild} disabled={busy} className="tk-pill-btn tk-btn-primary w-full mt-6 disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {hasPlan ? "Rebuild my plan" : "Build my plan"}
          </button>
          {hasPlan && (
            <Link href="/routine" className="block mt-3 text-sm font-medium text-muted hover:text-primary transition-colors">
              Keep my current plan
            </Link>
          )}
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-md mx-auto px-5 pt-4">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep">
          <ArrowLeft size={15} /> Back to profile
        </Link>
        {!hasProfile && (
          <p className="mt-3 rounded-2xl bg-accent-soft/60 border border-accent/20 px-4 py-3 text-sm text-primary">
            We&apos;ve improved how TintKin builds your plan. A few new questions let us make it safer and more personal.
          </p>
        )}
      </div>
      <SkinQuestionnaire
        initial={initial}
        finalLabel="Save my answers"
        onSubmit={async (payload) => {
          const res = await updateSkinProfile(payload);
          if (res?.success) setSaved(true);
          return res;
        }}
      />
    </div>
  );
}
