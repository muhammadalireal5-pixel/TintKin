import { CalendarCheck } from "lucide-react";
import PlanLengthEditor from "./PlanLengthEditor";

/** Where the user is in their plan: month, day, phase, and the plan's one-line summary. */
export default function PlanHeader({ plan }) {
  const pct = Math.min(100, Math.round((plan.day / plan.durationDays) * 100));
  return (
    <section className="tk-card p-5 sm:p-6" aria-label="Your plan">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tk-eyebrow">
            {plan.totalMonths > 1 ? `Month ${plan.monthIndex} of ${plan.totalMonths}` : `Your ${plan.durationDays}-day plan`}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-primary leading-tight mt-1">
            Day {plan.day} <span className="text-muted font-normal">of {plan.durationDays}</span>
          </h2>
        </div>
        <span className="tk-chip shrink-0"><CalendarCheck size={12} /> {plan.phase.name}</span>
      </div>

      <div
        className="mt-4 h-2 rounded-full bg-line overflow-hidden"
        role="progressbar"
        aria-label="Plan progress"
        aria-valuemin={0}
        aria-valuemax={plan.durationDays}
        aria-valuenow={plan.day}
      >
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <p className="text-sm text-primary/90 mt-4 leading-relaxed">{plan.summary}</p>
      <p className="text-xs text-muted mt-2">
        This phase: {plan.phase.intent.charAt(0).toLowerCase() + plan.phase.intent.slice(1)}.
        {plan.daysLeft > 0 ? ` ${plan.daysLeft} ${plan.daysLeft === 1 ? "day" : "days"} to go this month.` : ""}
      </p>
      <PlanLengthEditor monthIndex={plan.monthIndex} totalMonths={plan.totalMonths} />
    </section>
  );
}
