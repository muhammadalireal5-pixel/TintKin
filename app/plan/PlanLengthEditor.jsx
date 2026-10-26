"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import DurationPicker from "@/app/components/DurationPicker";
import { setPlanLength } from "@/app/lib/plan-actions";

/**
 * Change how many months the plan runs. Opens inline under the plan header; it
 * can lengthen the plan or shorten it, but never below the month already in.
 */
export default function PlanLengthEditor({ monthIndex, totalMonths, description = null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(totalMonths);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    const res = await setPlanLength(value, Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (res?.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(res?.error || "We couldn't save that. Please try again.");
    }
    setBusy(false);
  };

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Edit plan, currently ${totalMonths} ${totalMonths === 1 ? "month" : "months"}`}
      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-accent-deep hover:text-accent"
    >
      <Pencil size={12} /> Edit plan
    </button>
  );
  if (!open) {
    // With a description it is the header's third row: the phase on the left, the edit link on the right.
    return description ? (
      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="text-sm text-muted min-w-0">{description}</p>
        {trigger}
      </div>
    ) : (
      <div className="mt-3">{trigger}</div>
    );
  }
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm font-semibold text-primary mb-2">How long shall we work on your skin?</p>
      <DurationPicker value={value} onChange={setValue} min={monthIndex} compact />
      {error && <p className="text-sm text-danger mt-2" role="alert">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={save} disabled={busy} className="tk-pill-btn tk-btn-primary px-5 py-2 text-sm disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : "Save"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setValue(totalMonths); }} className="tk-pill-btn tk-btn-ghost px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}
