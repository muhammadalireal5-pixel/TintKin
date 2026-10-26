"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Share2, Trophy, ChevronRight, X } from "lucide-react";
import WeeklyGoalRing from "./WeeklyGoalRing";

/**
 * The streak as a small chip instead of a full-width card. Tapping it opens a
 * panel with the rest (this week's goal, milestones, share), so the Today
 * screen only spends a line on it.
 */
export default function StreakChip({ align = "left", streak, longestStreak, weeklyGoal, trophies }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const returning = streak === 0 && longestStreak > 0;
  const label = streak > 0 ? `${streak} day streak` : returning ? "Welcome back" : "Start your streak";
  const sub =
    streak > 0
      ? longestStreak > streak
        ? `Longest so far: ${longestStreak} days.`
        : "A routine step keeps it going."
      : returning
        ? `Your longest run was ${longestStreak} days. Start a fresh one today.`
        : "Tick a routine step today to begin it.";

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-full bg-paper border border-line pl-2 pr-2.5 py-1 text-xs font-semibold text-primary shadow-sm hover:border-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Flame size={13} className={`text-accent ${streak > 0 ? "tk-anim-flame" : ""}`} />
        {label}
      </button>

      {open && (
        <div role="dialog" aria-label="Streak" className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-2 z-30 w-[min(20rem,calc(100vw-2.5rem))] tk-card p-4 shadow-[0_14px_34px_-12px_rgb(var(--tk-ink-rgb)/0.35)]`}>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-primary/70 hover:bg-blush">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="tk-icon-circle w-10 h-10"><Flame size={18} className={streak > 0 ? "tk-anim-flame" : ""} /></span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-primary">{label}</p>
              <p className="text-xs text-muted leading-snug">{sub}</p>
            </div>
          </div>
          {weeklyGoal && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-blush/70 px-3 py-2.5">
              <WeeklyGoalRing days={weeklyGoal.days} target={weeklyGoal.target} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">{weeklyGoal.days >= weeklyGoal.target ? "Weekly goal reached" : "This week's goal"}</p>
                <p className="text-xs text-muted">
                  {weeklyGoal.days >= weeklyGoal.target ? "Lovely rhythm. Anything more is a bonus." : `${weeklyGoal.days} of ${weeklyGoal.target} days of care so far.`}
                </p>
              </div>
            </div>
          )}
          {trophies?.totalCount > 0 && (
            <Link href="/progress" className="mt-2 flex items-center gap-2 rounded-xl bg-blush/70 px-3 py-2.5 text-sm text-primary hover:bg-blush transition-colors">
              <Trophy size={15} className="text-accent" />
              <span className="flex-1">{trophies.unlockedCount} of {trophies.totalCount} milestones reached</span>
              <ChevronRight size={15} className="text-muted" />
            </Link>
          )}
          <Link href="/share" className="tk-pill-btn tk-btn-soft w-full mt-3 px-4 py-2 text-sm">
            <Share2 size={14} /> Share my progress
          </Link>
        </div>
      )}
    </div>
  );
}
