import Link from "next/link";
import { ScanFace, CalendarClock, CheckCircle2 } from "lucide-react";
import RatingsForm from "./RatingsForm";

/**
 * The next check-in. Due (or nearly due) it is a 30-second self-rating, with an
 * optional scan to add measured numbers; otherwise a quiet countdown.
 */
export default function CheckInCard({ plan }) {
  const next = plan.nextCheckIn;

  if (!next) {
    return (
      <section className="tk-card p-5 flex items-center gap-4" aria-label="Check-ins">
        <span className="tk-icon-circle w-11 h-11"><CheckCircle2 size={20} /></span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary">All check-ins done</p>
          <p className="text-sm text-muted">{plan.expired ? "Your 30 days are complete." : "Keep following your routine to the end of your plan."}</p>
        </div>
      </section>
    );
  }

  const daysAway = Math.max(0, next.day - plan.day);

  const rated = plan.progress.focus.some((f) => f.scale === "rating");
  if (next.isDue && rated) {
    return (
      <div className="flex flex-col gap-3">
        <RatingsForm plan={plan} title={`Day ${next.day} check-in: how is your skin?`} />
        <Link href="/capture" className="tk-pill-btn tk-btn-ghost w-full">
          <ScanFace size={16} /> Add a progress scan too (optional)
        </Link>
      </div>
    );
  }

  if (next.isDue) {
    return (
      <section className="tk-card p-5 border-accent/40 bg-accent-soft/40" aria-label="Check-in due">
        <div className="flex items-center gap-4">
          <span className="tk-icon-circle w-11 h-11 bg-white"><ScanFace size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-primary">Check-in due: see how far you&apos;ve come</p>
            <p className="text-sm text-muted">One scan in good, even light shows your progress against your aim.</p>
          </div>
        </div>
        <Link href="/capture" className="tk-pill-btn tk-btn-primary w-full mt-4">Do my check-in scan</Link>
      </section>
    );
  }

  return (
    <section className="tk-card p-5 flex items-center gap-4" aria-label="Next check-in">
      <span className="tk-icon-circle w-11 h-11"><CalendarClock size={20} /></span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-primary">
          Next check-in {daysAway === 0 ? "is today" : daysAway === 1 ? "is tomorrow" : `in ${daysAway} days`}
        </p>
        <p className="text-sm text-muted">Day {next.day}. Just follow your routine until then; your check-in takes 30 seconds.</p>
      </div>
    </section>
  );
}
