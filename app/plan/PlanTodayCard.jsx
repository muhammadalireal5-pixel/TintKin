import Link from "next/link";
import WeekDots from "./WeekDots";
import { CalendarCheck, ChevronRight, HeartHandshake } from "lucide-react";

/**
 * The Today screen's lead card: where the user is in the plan and how their two
 * focus areas are moving. The score is a starting point; this is the story.
 */
export default function PlanTodayCard({ plan, stepsLeft, stepsTotal = 0, week = null }) {
  const due = plan.nextCheckIn?.isDue && !plan.expired;
  const headline = plan.expired
    ? `Month ${plan.monthIndex} is complete`
    : stepsLeft > 0
      ? `${stepsLeft} ${stepsLeft === 1 ? "step" : "steps"} left today`
      : "Today's routine is done";

  return (
    <section data-tour="plan-card" className="tk-card p-4 sm:p-5" aria-label="Your plan">
      <Link href="/routine" className="flex items-start justify-between gap-3 group">
        <div className="min-w-0">
          <p className="tk-eyebrow flex items-center gap-1.5">
            <CalendarCheck size={13} /> {plan.totalMonths > 1 ? `Month ${plan.monthIndex}/${plan.totalMonths} · ` : ""}Day {plan.day} of {plan.durationDays} &middot; {plan.phase.name}
          </p>
          <h2 className="text-lg sm:text-xl font-semibold text-primary leading-tight mt-1">{headline}</h2>
        </div>
        <ChevronRight size={20} className="text-muted shrink-0 mt-1 group-hover:text-accent transition-colors" />
      </Link>

      <Link href="/routine" className="tk-pill-btn tk-btn-primary w-full mt-3">
        {due ? (
          <><HeartHandshake size={16} /> Check-in due: rate your skin</>
        ) : (
          <>{stepsLeft > 0 || plan.expired ? "Open today's steps" : "See today's plan"} <ChevronRight size={16} /></>
        )}
      </Link>

      {week && (
        <div className="mt-4">
          <WeekDots week={week} stepsTotal={stepsTotal} />
        </div>
      )}

      {plan.progress?.focus?.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Focus:</span>
          {plan.progress.focus.map((f) => <span key={f.metric} className="tk-chip">{f.label}</span>)}
        </div>
      )}

      {plan.nextCheckIn && !plan.expired && (() => {
        const away = Math.max(0, plan.nextCheckIn.day - plan.day);
        return (
          <Link href="/routine" className="mt-3 block text-xs text-muted hover:text-primary transition-colors">
            {due ? "Check-in due" : away === 0 ? "Next check-in today" : `Next check-in in ${away} ${away === 1 ? "day" : "days"}`}
          </Link>
        );
      })()}
    </section>
  );
}
