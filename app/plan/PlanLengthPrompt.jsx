"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2 } from "lucide-react";
import DurationPicker from "@/app/components/DurationPicker";
import { setPlanLength } from "@/app/lib/plan-actions";

/**
 * For accounts that were never asked how long they want to work on their skin
 * (everyone who signed up before plans could run for months). Saving any
 * choice, including one month, stops it from showing again.
 */
export default function PlanLengthPrompt() {
  const router = useRouter();
  const [value, setValue] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    const res = await setPlanLength(value, Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (res?.success) router.refresh();
    else {
      setError(res?.error || "We couldn't save that. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section className="tk-card p-4 sm:p-5 border-accent/30 bg-accent-soft/30" aria-label="Plan length">
      <h2 className="flex items-center gap-2 text-base font-semibold text-primary">
        <CalendarRange size={17} className="text-accent" /> How long shall we work on your skin?
      </h2>
      <p className="text-sm text-muted mt-1 mb-3">Plans can now run for months. Each month we review your progress and suggest changes, and you decide.</p>
      <DurationPicker value={value} onChange={setValue} compact />
      {error && <p className="text-sm text-danger mt-2" role="alert">{error}</p>}
      <button type="button" onClick={save} disabled={busy} className="tk-pill-btn tk-btn-primary w-full mt-3 disabled:opacity-60">
        {busy ? <Loader2 size={16} className="animate-spin" /> : "Save my plan length"}
      </button>
    </section>
  );
}
