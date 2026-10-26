import { Target } from "lucide-react";
import { RATING_LABELS } from "@/lib/constants/profile";

function Change({ delta, unit = "" }) {
  if (typeof delta !== "number" || delta === 0) return <span className="text-muted">no change yet</span>;
  return (
    <span className={delta > 0 ? "text-success font-semibold" : "text-muted"}>
      {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}{unit ? ` ${unit}${Math.abs(delta) === 1 ? "" : "s"}` : ""} since you started
    </span>
  );
}

/**
 * Where the area sits on the person's own 1-5 rating. Filled blocks are where
 * they are now, the dashed block is this month's aim, the dot marks where they
 * started. Five blocks, so "empty" never means "failing": it just means "not
 * there yet".
 */
function RatingScale({ f }) {
  return (
    <div
      className="grid grid-cols-5 gap-1"
      role="img"
      aria-label={`${f.label}: started at ${RATING_LABELS[f.baseline]}, now ${RATING_LABELS[f.current]}, aim ${RATING_LABELS[f.target]}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= f.current;
        const aim = n === f.target && n > f.current;
        return (
          <span
            key={n}
            className={`relative h-2.5 rounded-full ${filled ? "bg-accent" : aim ? "border border-dashed border-accent bg-accent-soft/50" : "bg-line"}`}
          >
            {n === f.baseline && (
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-1.5 h-1.5 rounded-full bg-primary/60" aria-hidden="true" />
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Start -> now -> aim for each focus area. Movement, not a verdict. */
export default function PlanProgress({ progress, compact = false, dense = false }) {
  if (!progress?.focus?.length) return null;
  return (
    <section className={compact ? "" : "tk-card p-5 sm:p-6"} aria-label="Your aim this month">
      {!compact && (
        <h2 className="flex items-center gap-2 text-base font-semibold text-primary mb-1">
          <span className="tk-icon-circle w-8 h-8"><Target size={16} /></span>
          Your aim this month
        </h2>
      )}
      {!compact && (
        <p className="text-sm text-muted mb-4">
          Your own rating of each area, from Struggling to Great. Filled blocks are where you are now, the dashed block is this month&apos;s aim, and the dot is where you started.
        </p>
      )}
      <ul className={dense ? "space-y-3" : "space-y-5"}>
        {progress.focus.map((f) => (
          <li key={f.metric}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-sm font-semibold text-primary">{f.label}</span>
              <span className="text-xs text-muted">
                {f.scale === "rating" ? (
                  <>{f.rated ? "Now" : "Starting at"} <strong className="text-primary">{RATING_LABELS[f.current]}</strong> &middot; aim {RATING_LABELS[f.target]}</>
                ) : (
                  <>{f.baseline} <span aria-hidden="true">&rarr;</span> <strong className="text-primary">{f.current ?? "—"}</strong> &middot; aim {f.target}</>
                )}
              </span>
            </div>

            {f.scale === "rating" ? (
              <RatingScale f={f} />
            ) : (
              <div
                className="h-2.5 rounded-full bg-line overflow-hidden"
                role="progressbar"
                aria-label={`${f.label} progress toward aim`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={f.percentToTarget}
              >
                {f.rated && <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(f.percentToTarget, 3)}%` }} />}
              </div>
            )}

            {!dense && (
              <p className="text-xs mt-3">
                {f.scale === "rating" && !f.rated ? <span className="text-muted">Not rated yet. Rate it at your first check-in to see it move.</span> : f.scale !== "rating" && !f.rated ? <span className="text-muted">Not measured yet. Your next scan will show it here.</span> : <Change delta={f.delta} unit={f.scale === "rating" ? "level" : ""} />}
                {f.measured && <span className="text-muted"> &middot; scan: {f.measured.from} &rarr; {f.measured.to}</span>}
              </p>
            )}
          </li>
        ))}
      </ul>
      {progress.targetsReached && (
        <p className="mt-4 text-sm font-medium text-success">You have reached your aim. Lovely work.</p>
      )}
    </section>
  );
}
