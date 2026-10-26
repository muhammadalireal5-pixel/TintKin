/** The phases as equal segments of one bar: done and current filled, the rest grey. */
export default function PlanTimeline({ plan }) {
  const current = plan.phase;
  const next = plan.nextCheckIn;
  return (
    <section className="tk-card p-4 sm:p-5" aria-label="Plan timeline">
      <h2 className="text-[15px] font-semibold text-primary mb-3">The road to day {plan.durationDays}</h2>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${plan.phases.length}, minmax(0, 1fr))` }}>
        {plan.phases.map((p) => {
          const isCurrent = plan.day >= p.startDay && plan.day <= p.endDay;
          const reached = plan.day >= p.startDay;
          return (
            <li key={p.key} className="min-w-0" aria-current={isCurrent ? "step" : undefined}>
              <span className={`block h-2 rounded-full ${reached ? "bg-accent" : "bg-line"}`} aria-hidden="true" />
              <p className={`mt-1.5 text-xs leading-tight truncate ${isCurrent ? "font-bold text-primary" : "text-muted"}`}>{p.name}</p>
              <p className="tk-text-micro text-muted tabular-nums">{p.startDay}&ndash;{p.endDay}</p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">
        <span className="font-semibold text-primary">You are here:</span> {(current.intent || current.name).replace(/\.$/, "")}.
        {next ? ` Check-in on day ${next.day}.` : ""}
      </p>
    </section>
  );
}
