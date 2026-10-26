import { METRIC_LABELS, SKIN_METRICS } from "@/lib/constants/metrics";

const ORDER = [SKIN_METRICS.WRINKLES, SKIN_METRICS.FIRMNESS, SKIN_METRICS.SPOTS, SKIN_METRICS.RADIANCE];

const tone = (v) => (v >= 80 ? { text: "text-success", bar: "bg-success" } : v >= 60 ? { text: "text-warn", bar: "bg-warn" } : { text: "text-danger", bar: "bg-danger" });

export default function SkinProfileBars({ scores, baseline }) {
  const rows = ORDER.filter((k) => typeof scores?.[k] === "number");
  if (rows.length === 0) return <p className="text-sm text-muted py-4">Your skin profile appears after your first scan.</p>;
  return (
    <ul className="space-y-4">
      {rows.map((k) => {
        const value = Math.round(scores[k]);
        const start = typeof baseline?.[k] === "number" ? Math.round(baseline[k]) : null;
        const t = tone(value);
        return (
          <li key={k}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-sm text-primary">{METRIC_LABELS[k]}</span>
              <span className={`text-base font-semibold tabular-nums ${t.text}`}>{value}</span>
            </div>
            <div
              className="relative h-1.5 rounded-full bg-line"
              role="progressbar"
              aria-label={`${METRIC_LABELS[k]}${start != null ? `, started at ${start}` : ""}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
            >
              <span className={`absolute inset-y-0 left-0 rounded-full ${t.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
              {start != null && (
                <span
                  className="absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper border-2 border-primary/60"
                  style={{ left: `${Math.max(0, Math.min(100, start))}%` }}
                  title={`Started at ${start}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
