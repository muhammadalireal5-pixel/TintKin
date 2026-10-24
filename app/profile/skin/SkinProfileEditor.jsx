"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import SkinQuestionnaire from "@/app/components/SkinQuestionnaire";
import { updateSkinProfile } from "@/app/lib/actions";
import { retireActivePlan, refreshPlanFromProfile } from "@/app/lib/plan-actions";

/**
 * "Update my skin profile": the same questionnaire, prefilled. Saving always
 * stops any step the new answers make unsafe. Then the person chooses: update
 * the rest of the plan to match (day and progress kept), start over from day 1,
 * or leave the plan as it is.
 */
export default function SkinProfileEditor({ initial, hasProfile, hasPlan }) {
  const router = useRouter();
  const [saved, setSaved] = useState(null); // { stopped }
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

  const update = async () => {
    setBusy("update");
    setError("");
    const res = await refreshPlanFromProfile(tz());
    if (res?.success) {
      router.push("/routine");
    } else {
      setError(res?.error || "We couldn't update your plan. Please try again.");
      setBusy("");
    }
  };

  const startOver = async () => {
    setBusy("restart");
    setError("");
    const res = await retireActivePlan();
    if (res?.success) {
      router.push("/welcome");
    } else {
      setError(res?.error || "We couldn't restart your plan. Please try again.");
      setBusy("");
    }
  };

  if (saved) {
    return (
      <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
        <section className="tk-card w-full max-w-md p-6 sm:p-8 text-center tk-anim-1">
          <span className="tk-icon-circle w-14 h-14 mx-auto"><Check size={26} /></span>
          <h1 className="text-xl sm:text-2xl font-semibold text-primary mt-4">Profile updated</h1>

          {saved.stopped > 0 && (
            <p className="mt-3 rounded-2xl bg-success-soft px-4 py-3 text-sm text-primary flex items-start gap-2 text-left">
              <ShieldCheck size={16} className="text-success shrink-0 mt-0.5" />
              We stopped {saved.stopped} {saved.stopped === 1 ? "step" : "steps"} in your plan that aren&apos;t suitable for your new answers.
            </p>
          )}

          <p className="text-sm text-muted mt-3">
            {hasPlan
              ? "Want the rest of your plan to match your new answers? Your day, check-ins and progress are kept."
              : "Your answers are saved. Let's build your plan from them."}
          </p>
          {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}

          {hasPlan ? (
            <>
              <button type="button" onClick={update} disabled={Boolean(busy)} className="tk-pill-btn tk-btn-primary w-full mt-6 disabled:opacity-50">
                {busy === "update" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Update my plan
              </button>
              <button type="button" onClick={startOver} disabled={Boolean(busy)} className="tk-pill-btn tk-btn-ghost w-full mt-2.5 disabled:opacity-50">
                {busy === "restart" ? <Loader2 size={16} className="animate-spin" /> : null} Start over from day 1
              </button>
              <Link href="/routine" className="block mt-3 text-sm font-medium text-muted hover:text-primary transition-colors">
                Keep my plan as it is
              </Link>
            </>
          ) : (
            <button type="button" onClick={startOver} disabled={Boolean(busy)} className="tk-pill-btn tk-btn-primary w-full mt-6 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Build my plan
            </button>
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
          if (res?.success) setSaved({ stopped: res.stopped || 0 });
          return res;
        }}
      />
    </div>
  );
}
