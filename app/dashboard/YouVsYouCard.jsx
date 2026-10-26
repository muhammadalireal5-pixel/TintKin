import { TrendingUp } from "lucide-react";
import WeekDots from "@/app/plan/WeekDots";

function Row({ label, now, before, unit = "" }) {
  const has = typeof now === "number";
  const diff = has && typeof before === "number" ? now - before : null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-line last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right">
        <span className="text-[17px] font-semibold text-primary tabular-nums">{has ? `${now}${unit}` : "—"}</span>
        <span className="block tk-text-micro text-muted">
          {typeof before === "number" ? `last month ${before}${unit}` : "no data last month"}
          {diff !== null && diff !== 0 && ` · ${diff > 0 ? "+" : ""}${diff}`}
        </span>
      </span>
    </div>
  );
}

// The personal counterpart to the community board: only ever you against you.
export default function YouVsYouCard({ activity, longestStreak = 0, stepsTotal = 0 }) {
  if (!activity) return null;
  const { monthDays, prevMonthDays, monthScore, prevMonthScore } = activity;
  const week = { steps: activity.weekSteps, todayIndex: activity.weekTodayIndex };

  return (
    <section className="tk-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={15} className="text-accent" />
        <h2 className="text-[15px] font-semibold text-primary">You vs. you</h2>
      </div>
      <p className="text-xs text-muted mb-3">This month against last month. No one else is in this comparison.</p>

      {week && (
        <div className="mb-2">
          <WeekDots week={week} stepsTotal={stepsTotal} />
        </div>
      )}

      <Row label="Days of care" now={monthDays} before={prevMonthDays} />
      <Row label="Average skin score" now={monthScore} before={prevMonthScore} />
      <div className="flex items-baseline justify-between gap-3 py-2.5">
        <span className="text-sm text-muted">Longest streak</span>
        <span className="text-[17px] font-semibold text-primary tabular-nums">{longestStreak > 0 ? `${longestStreak} days` : "—"}</span>
      </div>
    </section>
  );
}
