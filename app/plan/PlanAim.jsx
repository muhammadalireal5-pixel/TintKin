import { RATING_LABELS } from "@/lib/constants/profile";

const label = (f, n) => (f.scale === "rating" ? RATING_LABELS[n] : n ?? "—");

/** This month's aim per focus area: where you started and where you are heading. */
export default function PlanAim({ progress }) {
  if (!progress?.focus?.length) return null;
  return (
    <section className="tk-card p-4 sm:p-5" aria-label="Your aim this month">
      <h2 className="text-[15px] font-semibold text-primary mb-1">Your aim this month</h2>
      <ul className="divide-y divide-line">
        {progress.focus.map((f) => (
          <li key={f.metric} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="text-sm text-primary truncate">{f.label}</span>
            <span className="text-sm text-muted whitespace-nowrap">
              {label(f, f.baseline)} <span aria-hidden="true">&rarr;</span> <span className="sr-only">aim </span><strong className="text-primary">{label(f, f.target)}</strong>
            </span>
          </li>
        ))}
      </ul>
      {progress.targetsReached ? (
        <p className="mt-2 text-xs font-medium text-success">You have reached your aim. Lovely work.</p>
      ) : (
        <p className="mt-2 text-xs text-muted">Rate each area at your next check-in to track the move.</p>
      )}
    </section>
  );
}
