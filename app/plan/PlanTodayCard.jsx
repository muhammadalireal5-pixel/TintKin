import Link from "next/link";
import { CalendarCheck, ChevronRight, HeartHandshake } from "lucide-react";
import PlanProgress from "./PlanProgress";

/**
 * The Today screen's lead card: where the user is in the plan and how their two
 * focus areas are moving. The score is a starting point; this is the story.
 */
export default function PlanTodayCard({ plan, stepsLeft }) {
  const due = plan.nextCheckIn?.isDue && !plan.expired;
  const headline = plan.expired
    ? "Your 30 days are complete"
    : stepsLeft > 0
      ? `${stepsLeft} ${stepsLeft === 1 ? "step" : "steps"} left today`
      : "Today's routine is done";

  return (
    <section data-tour="plan-card" className="tk-card p-5 sm:p-6" aria-label="Your plan">
      <Link href="/routine" className="flex items-start justify-between gap-3 group">
        <div className="min-w-0">
          <p className="tk-eyebrow flex items-center gap-1.5">
            <CalendarCheck size={13} /> Day {plan.day} of {plan.durationDays} &middot; {plan.phase.name}
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold text-primary leading-tight mt-1.5">{headline}</h2>
        </div>
        <ChevronRight size={20} className="text-muted shrink-0 mt-1 group-hover:text-accent transition-colors" />
      </Link>

      <div className="mt-4">
        <PlanProgress progress={plan.progress} compact />
      </div>

      {due && (
        <Link href="/routine" className="tk-pill-btn tk-btn-primary w-full mt-5">
          <HeartHandshake size={16} /> Check-in due: rate your skin
        </Link>
      )}
    </section>
  );
}
