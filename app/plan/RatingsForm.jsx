"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HeartHandshake } from "lucide-react";
import { submitCheckInRatings } from "@/app/lib/plan-actions";
import { RATING_LABELS } from "@/lib/constants/profile";

// Warmer as the rating improves, so a glance shows how the skin feels.
const TONES = [
  "",
  "bg-danger-soft text-danger border-danger/30",
  "bg-accent-soft text-accent-deep border-accent/30",
  "bg-blush text-primary border-line",
  "bg-success-soft text-success border-success/30",
  "bg-success text-white border-success",
];

/**
 * The self-rated check-in: "how does this feel right now?" for each focus area,
 * 1 to 5. Completes the due check-in (no scan needed), or adds ratings to a
 * check-in a scan already completed.
 */
export default function RatingsForm({ plan, title = "How does your skin feel today?", cta = "Save my check-in" }) {
  const router = useRouter();
  const focus = plan.progress.focus.filter((f) => f.scale === "rating");
  const [ratings, setRatings] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!focus.length) return null;
  const ready = focus.every((f) => ratings[f.metric]);

  const save = async () => {
    setSaving(true);
    setError("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await submitCheckInRatings(ratings, tz);
    if (res?.success) {
      router.refresh();
    } else {
      setError(res?.error || "We couldn't save that. Please try again.");
      setSaving(false);
    }
  };

  return (
    <section className="tk-card p-5 sm:p-6 border-accent/40 bg-accent-soft/40" aria-label="Check-in">
      <div className="flex items-center gap-3">
        <span className="tk-icon-circle w-11 h-11 bg-paper"><HeartHandshake size={20} /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary">{title}</p>
          <p className="text-sm text-muted">Rate each area as it looks and feels right now. It takes 30 seconds.</p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {focus.map((f) => (
          <fieldset key={f.metric}>
            <legend className="text-sm font-semibold text-primary mb-2">
              {f.label} <span className="text-xs font-normal text-muted">(started at {RATING_LABELS[f.baseline]})</span>
            </legend>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => {
                const on = ratings[f.metric] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatings((r) => ({ ...r, [f.metric]: n }))}
                    aria-pressed={on}
                    className={`rounded-xl border px-1 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      on ? `${TONES[n]} scale-[1.04] shadow-sm font-semibold` : "bg-paper border-line text-muted hover:border-accent/50"
                    }`}
                  >
                    <span className="block text-base tabular-nums">{n}</span>
                    <span className="block text-[10px] leading-tight mt-0.5">{RATING_LABELS[n]}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error && <p className="text-sm text-danger mt-4" role="alert">{error}</p>}
      <button type="button" onClick={save} disabled={!ready || saving} className="tk-pill-btn tk-btn-primary w-full mt-5 disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null} {cta}
      </button>
    </section>
  );
}
