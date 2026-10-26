import { CalendarClock } from "lucide-react";
import PlanLengthEditor from "./PlanLengthEditor";

function checkInLabel(plan) {
  const next = plan.nextCheckIn;
  if (!next) return plan.expired ? "Month complete" : "All check-ins done";
  const away = Math.max(0, next.day - plan.day);
  if (next.isDue) return "Check-in due";
  return away === 0 ? "Check-in today" : away === 1 ? "Check-in tomorrow" : `Check-in in ${away} days`;
}

/** Where the user is: month, day, phase and the next check-in, in one card. */
export default function PlanHeader({ plan }) {
  const intent = (plan.phase.intent || "").replace(/\.$/, "");
  return (
    <section className="tk-card p-4 sm:p-5" aria-label="Your plan">
      <div className="flex items-center justify-between gap-3">
        <p className="tk-eyebrow">
          {plan.totalMonths > 1 ? `Month ${plan.monthIndex} of ${plan.totalMonths}` : `${plan.durationDays}-day plan`}
        </p>
        <span className="tk-chip shrink-0">{plan.phase.name}</span>
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-3">
        <h2 className="text-[1.75rem] sm:text-3xl font-semibold text-primary leading-none tabular-nums">
          Day {plan.day} <span className="text-base font-normal text-muted">of {plan.durationDays}</span>
        </h2>
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted whitespace-nowrap">
          <CalendarClock size={14} aria-hidden="true" /> {checkInLabel(plan)}
        </p>
      </div>

      <div
        className="mt-3 grid gap-1"
        style={{ gridTemplateColumns: plan.phases.map((p) => `${p.endDay - p.startDay + 1}fr`).join(" ") }}
        role="progressbar"
        aria-label={`Plan progress, ${plan.phase.name} phase`}
        aria-valuemin={0}
        aria-valuemax={plan.durationDays}
        aria-valuenow={plan.day}
      >
        {plan.phases.map((p) => {
          const span = p.endDay - p.startDay + 1;
          const fill = Math.max(0, Math.min(100, ((plan.day - p.startDay + 1) / span) * 100));
          return (
            <span key={p.key} title={`${p.name}: days ${p.startDay}-${p.endDay}`} className="block h-1.5 rounded-full bg-line overflow-hidden">
              <span className="block h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${fill}%` }} />
            </span>
          );
        })}
      </div>

      <PlanLengthEditor monthIndex={plan.monthIndex} totalMonths={plan.totalMonths} description={intent} />
    </section>
  );
}
