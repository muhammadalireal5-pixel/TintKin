"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Check, Loader2 } from "lucide-react";
import AnimatedModal from "@/app/components/AnimatedModal";
import { setPlanLength } from "@/app/lib/plan-actions";
import { DEFAULT_PLAN_MONTHS } from "@/lib/constants/plan";

/**
 * Shown to accounts that were never asked how long they want to work on their
 * skin. "Yes" opens the profile questionnaire at that one question; "No"
 * settles it on the default (3 months) and says so, which also stops it from
 * showing again.
 */
export default function PlanLengthModal() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState("");

  const decline = async () => {
    setBusy(true);
    setError("");
    const res = await setPlanLength(DEFAULT_PLAN_MONTHS, Intl.DateTimeFormat().resolvedOptions().timeZone);
    setBusy(false);
    if (res?.success) setDeclined(true);
    else setError(res?.error || "We couldn't save that. Please try again.");
  };

  const accept = () => {
    setOpen(false);
    router.push("/profile/skin?step=length");
  };

  const done = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={declined ? done : decline}
      closeOnBackdrop={false}
      variant="center"
      zIndex={90}
      ariaLabel="Upgrade your plan"
      size="md"
      panelClassName="p-6 pt-7 sm:pt-6"
    >
      {declined ? (
        <>
          <span className="tk-icon-circle w-11 h-11"><Check size={20} /></span>
          <h3 className="text-xl font-semibold text-primary mt-3">We&apos;ve set your plan to {DEFAULT_PLAN_MONTHS} months</h3>
          <p className="text-sm text-muted mt-2">
            That gives your skin time to change, with a check-in on how it went every month. You can change this whenever you like from your plan page.
          </p>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={done} className="tk-pill-btn tk-btn-primary px-6 py-3 text-sm">Got it</button>
          </div>
        </>
      ) : (
        <>
          <span className="tk-icon-circle w-11 h-11"><CalendarRange size={20} /></span>
          <h3 className="text-xl font-semibold text-primary mt-3">Want to upgrade your plan?</h3>
          <p className="text-sm text-muted mt-2">
            Plans can now run for months, not just 30 days. Pick 3, 5 or 7 months, or your own length. Each month we look at how it went and suggest changes, and you decide.
          </p>
          <p className="text-sm text-muted mt-2">If you&apos;d rather not, we&apos;ll default to {DEFAULT_PLAN_MONTHS} months.</p>
          {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={decline} disabled={busy} className="tk-pill-btn tk-btn-ghost px-5 py-3 text-sm disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : "No, thanks"}
            </button>
            <button type="button" onClick={accept} disabled={busy} className="tk-pill-btn tk-btn-primary px-5 py-3 text-sm disabled:opacity-60">Yes, choose my length</button>
          </div>
        </>
      )}
    </AnimatedModal>
  );
}
