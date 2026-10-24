import { Check, X } from "lucide-react";

/** The four phases with the check-ins that sit between them. */
export default function PlanTimeline({ plan }) {
  return (
    <section className="tk-card p-5 sm:p-6" aria-label="Plan timeline">
      <h2 className="text-[15px] font-semibold text-primary mb-4">The road to day {plan.durationDays}</h2>
      <ol className="space-y-0">
        {plan.phases.map((p, i) => {
          const current = plan.day >= p.startDay && plan.day <= p.endDay;
          const past = plan.day > p.endDay;
          const checkIn = plan.checkIns.find((c) => c.day >= p.startDay && c.day <= p.endDay) || null;
          return (
            <li key={p.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    past ? "bg-accent text-white" : current ? "bg-accent-soft text-accent-deep ring-2 ring-accent" : "bg-line text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {past ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                {i < plan.phases.length - 1 && <span className="w-px flex-1 bg-line my-1" aria-hidden="true" />}
              </div>
              <div className={`pb-5 min-w-0 ${i === plan.phases.length - 1 ? "pb-0" : ""}`}>
                <p className={`text-sm font-semibold ${current ? "text-primary" : "text-primary/80"}`}>
                  {p.name} <span className="text-xs font-normal text-muted">days {p.startDay}&ndash;{p.endDay}</span>
                  {current && <span className="tk-chip ml-2">You are here</span>}
                </p>
                <p className="text-xs text-muted mt-0.5">{p.intent}</p>
                {checkIn && (
                  <p className="text-xs mt-1.5 inline-flex items-center gap-1 text-muted">
                    {checkIn.status === "done" ? (
                      <><Check size={12} className="text-success" /> Check-in done</>
                    ) : checkIn.status === "missed" ? (
                      <><X size={12} /> Check-in skipped</>
                    ) : (
                      <>Check-in on day {checkIn.day}</>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
