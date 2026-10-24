import { Target } from "lucide-react";

function Change({ delta }) {
  if (typeof delta !== "number" || delta === 0) return <span className="text-muted">no change yet</span>;
  return (
    <span className={delta > 0 ? "text-success font-semibold" : "text-muted"}>
      {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`} since you started
    </span>
  );
}

/** Start -> now -> aim for each focus area. Movement, not a verdict. */
export default function PlanProgress({ progress, compact = false }) {
  if (!progress?.focus?.length) return null;
  return (
    <section className={compact ? "" : "tk-card p-5 sm:p-6"} aria-label="Your 30-day aim">
      {!compact && (
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-primary mb-1">
          <span className="tk-icon-circle w-8 h-8"><Target size={16} /></span>
          Your 30-day aim
        </h2>
      )}
      {!compact && <p className="text-sm text-muted mb-4">The two areas this plan works on, and how far you have come.</p>}
      <ul className="space-y-4">
        {progress.focus.map((f) => (
          <li key={f.metric}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-primary">{f.label}</span>
              <span className="text-xs text-muted tabular-nums">
                {f.baseline} <span aria-hidden="true">&rarr;</span> <strong className="text-primary">{f.current ?? "—"}</strong> &middot; aim {f.target}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 rounded-full bg-line overflow-hidden"
              role="progressbar"
              aria-label={`${f.label} progress toward aim`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={f.percentToTarget}
            >
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(f.percentToTarget, 3)}%` }} />
            </div>
            <p className="text-xs mt-1"><Change delta={f.delta} /></p>
          </li>
        ))}
      </ul>
      {progress.targetsReached && (
        <p className="mt-4 text-sm font-medium text-success">You have reached your aim on both. Lovely work.</p>
      )}
    </section>
  );
}
