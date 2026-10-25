"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PartyPopper, Sparkles, TrendingUp, Minus, Clock } from "lucide-react";
import { getMonthReviewAction, startNextPlanAction } from "@/app/lib/plan-actions";

const ICONS = { reached: Check, improved: TrendingUp, steady: Minus, unrated: Minus };

/**
 * Shown when a month of the plan has run its 30 days. It says what the records
 * show, proposes what to change next month in plain words, and the person
 * decides: take the changes, or carry on unchanged. Either way the routine that
 * is working carries into the next month.
 */
export default function NextPlanCard() {
  const router = useRouter();
  const [review, setReview] = useState(undefined); // undefined = loading, null = none
  const [busy, setBusy] = useState(null); // "accept" | "keep"
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getMonthReviewAction(tz).then((res) => {
      if (!cancelled) setReview(res?.success ? res.review : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = async (accept) => {
    setBusy(accept ? "accept" : "keep");
    setError("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await startNextPlanAction(tz, accept);
    if (res?.success && res.created) {
      router.refresh();
    } else {
      setError(res?.error || "We couldn't start your next month. Please try again.");
      setBusy(null);
    }
  };

  const month = review?.month ?? 1;
  const final = Boolean(review?.isFinal);
  const next = month + 1;
  const hasChanges = Boolean(review?.proposals?.length);
  // The last observation is about consistency (it has no focus area of its own).
  const consistency = review && review.observations.length > review.focus.length ? review.observations[review.observations.length - 1] : "";

  return (
    <section className="tk-card p-5 sm:p-6 bg-accent-soft/40 border-accent/30" aria-label="Month review">
      <div className="flex items-start gap-3">
        <span className="tk-icon-circle w-10 h-10 bg-white shrink-0"><PartyPopper size={18} /></span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-primary">
            {final ? `You finished your ${review.totalMonths}-month journey` : `Month ${month} complete`}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {review === undefined
              ? "Looking at how your month went…"
              : final
                ? "Take a moment to see how far you've come. You can keep going for another month."
                : `Here's what we noticed, and what we'd change for month ${next}.`}
          </p>
        </div>
      </div>

      {review === undefined && <div className="mt-4 h-20 rounded-2xl bg-blush animate-pulse" aria-hidden="true" />}

      {review && (
        <div className="mt-4 space-y-4">
          <ul className="space-y-2">
            {review.focus.map((f) => {
              const Icon = ICONS[f.status] || Minus;
              const good = f.status === "reached" || f.status === "improved";
              return (
                <li key={f.metric} className="flex items-start gap-2.5 text-sm text-primary leading-snug">
                  <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${good ? "bg-success-soft text-success" : "bg-blush text-muted"}`}>
                    <Icon size={12} strokeWidth={2.5} />
                  </span>
                  <span>{f.text}</span>
                </li>
              );
            })}
            {consistency && (
              <li className="flex items-start gap-2.5 text-sm text-primary leading-snug">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-blush text-muted flex items-center justify-center"><Clock size={12} /></span>
                <span>{consistency}</span>
              </li>
            )}
          </ul>

          {hasChanges && (
            <div className="rounded-2xl bg-white border border-line p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Sparkles size={15} className="text-accent" /> Are you okay if we change month {next} like this?
              </p>
              <ul className="mt-2 space-y-1.5">
                {review.proposals.map((p) => (
                  <li key={p.id} className="text-sm text-muted leading-snug pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent">
                    {p.text}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-2">Your current routine carries over either way. Nothing you have done is lost.</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={() => start(hasChanges)} disabled={busy !== null || review === undefined} className="tk-pill-btn tk-btn-primary w-full disabled:opacity-60">
          {busy === "accept" || (busy === "keep" && !hasChanges)
            ? <><Loader2 size={16} className="animate-spin" /> Starting&hellip;</>
            : hasChanges ? "Yes, update my plan" : final ? "Keep going for another month" : `Start month ${next}`}
        </button>
        {hasChanges && (
          <button type="button" onClick={() => start(false)} disabled={busy !== null} className="tk-pill-btn tk-btn-ghost w-full disabled:opacity-60">
            {busy === "keep" ? <><Loader2 size={16} className="animate-spin" /> Starting&hellip;</> : "No, keep it the same"}
          </button>
        )}
      </div>
    </section>
  );
}
