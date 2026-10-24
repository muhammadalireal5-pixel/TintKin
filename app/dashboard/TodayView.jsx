"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Target,
  CalendarCheck,
  Sun,
  Moon,
  Dumbbell,
  ShoppingBag,
  Sparkles,
  FileText,
  Trophy,
  Flame,
  Share2,
  ScanFace,
} from "lucide-react";
import SegmentedTabs from "@/app/components/ui/SegmentedTabs";
import WeeklyGoalRing from "./WeeklyGoalRing";
import { kinSay } from "@/app/components/companion/store";
import { milestoneLine } from "@/app/components/companion/brain";

// Time-of-day greeting. Read via useSyncExternalStore so the server render
// (and hydration) use the neutral fallback and the client swaps in the real
// one without a mismatch.
const noopSubscribe = () => () => {};

const LG_QUERY = "(min-width: 1024px)";
const subscribeLg = (cb) => {
  const mql = window.matchMedia(LG_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
function greetingNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

function Delta({ value }) {
  if (typeof value !== "number" || value === 0) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center tk-text-micro font-semibold ${up ? "text-success" : "text-danger"}`}>
      {up ? <ArrowUp size={11} strokeWidth={3} /> : <ArrowDown size={11} strokeWidth={3} />}
      {Math.abs(value)}
    </span>
  );
}

function ScoreCard({ mode, score, delta, band, skinAgeLine, photoUrl, weekScans, sinceStart }) {
  const label = mode === "week" ? "WEEKLY SKIN SCORE" : "SKIN SCORE";
  return (
    <section data-tour="score" className="tk-card relative overflow-hidden h-[13.25rem] sm:h-[14.5rem] lg:h-[17rem]" aria-label="Skin score">
      {/* Latest scan. Fixed 3:4 frame pinned to the right so the photo keeps the
          same size when the numbers on the left change (Today / This week). */}
      <div
        className="absolute inset-y-0 right-0 aspect-[3/4]"
        style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 38%)", maskImage: "linear-gradient(to right, transparent 0%, #000 38%)" }}
        aria-hidden="true"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent-soft to-blush flex flex-col items-center justify-center gap-2 pl-6">
            <ScanFace size={56} className="text-accent/40" strokeWidth={1.25} />
            <span className="tk-text-micro text-muted/80 text-center leading-tight px-2">Photo not stored</span>
          </div>
        )}
      </div>

      <div className="relative p-5 sm:p-6 lg:p-9 max-w-[66%] sm:max-w-[60%]">
        <p className="tk-eyebrow">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-[3.5rem] sm:text-[4rem] lg:text-[5.5rem] font-semibold leading-none text-primary tabular-nums">
            {typeof score === "number" ? score : "—"}
          </span>
          <span className="text-lg lg:text-2xl text-muted">/ 100</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {mode === "today" && typeof delta === "number" && delta !== 0 && (
            <span className={`tk-chip ${delta > 0 ? "tk-chip-success" : "tk-chip-danger"}`}>
              {delta > 0 ? <ArrowUp size={11} strokeWidth={3} /> : <ArrowDown size={11} strokeWidth={3} />}
              {Math.abs(delta)} vs. last scan
            </span>
          )}
          {mode === "today" && sinceStart && (
            <span className="tk-chip">Started at {sinceStart.from}{sinceStart.delta ? ` · ${sinceStart.delta > 0 ? "+" : "−"}${Math.abs(sinceStart.delta)}` : ""}</span>
          )}
          {mode === "week" && weekScans > 0 && (
            <span className="tk-chip">{weekScans} {weekScans === 1 ? "scan" : "scans"} this week</span>
          )}
          {band && (
            <span className="text-xs font-semibold text-success">{band}</span>
          )}
        </div>

        {skinAgeLine && <p className="mt-3 text-xs lg:text-sm text-muted leading-snug">{skinAgeLine}</p>}
      </div>
    </section>
  );
}

function MetricRow({ metrics, mode }) {
  return (
    <div data-tour="metrics" className="grid grid-cols-4 gap-2 sm:gap-3 rounded-2xl" role="list" aria-label="Skin metrics">
      {metrics.map((m) => {
        const value = mode === "week" ? m.week : m.today;
        return (
          <div key={m.key} role="listitem" className="tk-tile px-2 py-3 sm:p-4 lg:p-5 text-center sm:text-left">
            <p className="tk-text-micro sm:text-xs text-muted font-medium truncate">{m.label}</p>
            <p className="mt-1 flex items-center justify-center sm:justify-start gap-1">
              <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-primary tabular-nums">
                {typeof value === "number" ? value : "—"}
              </span>
              {mode === "today" && <Delta value={m.delta} />}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function FocusCard({ focus }) {
  return (
    <Link
      data-tour="focus"
      href="/routine"
      className="tk-card flex items-center gap-3.5 p-4 sm:p-5 hover:border-accent/40 transition-colors"
    >
      <span className="tk-icon-circle w-11 h-11"><Target size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-primary">Today&apos;s Focus</span>
        <span className="block text-sm font-medium text-primary/90 mt-0.5">{focus.title}</span>
        <span className="block text-xs text-muted mt-0.5 line-clamp-2">{focus.text}</span>
      </span>
      <ChevronRight size={18} className="text-muted shrink-0" />
    </Link>
  );
}

function PlanSection({ plan }) {
  const tiles = [
    { href: "/routine?tab=am", label: "Morning Routine", icon: Sun, done: plan.amDone, total: plan.amTotal },
    { href: "/routine?tab=pm", label: "Evening Routine", icon: Moon, done: plan.pmDone, total: plan.pmTotal },
    { href: "/routine#workout", label: "Face Workout", icon: Dumbbell, text: plan.hasWorkout ? "1 move" : "—" },
    { href: "/routine#products", label: "Products", icon: ShoppingBag, text: plan.productCount ? `${plan.productCount} picks` : "—" },
  ];
  const total = plan.amTotal + plan.pmTotal;
  const done = plan.amDone + plan.pmDone;
  return (
    <section data-tour="plan" className="tk-card p-4 sm:p-5 lg:p-6" aria-label="Today's plan">
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-primary">
          <CalendarCheck size={18} className="text-accent" /> Today&apos;s Plan
        </h2>
        {total > 0 && <span className="text-xs text-muted tabular-nums">{done} of {total} completed</span>}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {tiles.map(({ href, label, icon: Icon, done: d, total: t, text }) => {
          const complete = typeof t === "number" && t > 0 && d >= t;
          return (
            <Link
              key={label}
              href={href}
              className={`tk-tile flex flex-col items-center text-center gap-1.5 px-1.5 py-3 lg:py-6 hover:border-accent/40 transition-colors ${complete ? "bg-success-soft" : ""}`}
            >
              <span className={`w-8 h-8 flex items-center justify-center ${complete ? "text-success" : "text-accent"}`}>
                <Icon size={22} strokeWidth={1.8} className="lg:scale-125" />
              </span>
              <span className="tk-text-micro sm:text-xs lg:text-sm font-semibold text-primary leading-tight">{label}</span>
              <span className="tk-text-micro text-muted tabular-nums">
                {typeof t === "number" ? `${d}/${t}` : text}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function StreakCard({ streak, longestStreak, weeklyGoal, trophies }) {
  const returning = streak === 0 && longestStreak > 0;
  const title = streak > 0 ? `${streak} day streak` : returning ? "Welcome back" : "Start your streak";
  const sub =
    streak > 0
      ? longestStreak > streak
        ? `Longest so far: ${longestStreak} days.`
        : "A scan or a routine step keeps it going."
      : returning
        ? `Your longest run was ${longestStreak} days. Start a fresh one today.`
        : "A scan or a routine step today begins it.";
  return (
    <section className="tk-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="tk-icon-circle w-11 h-11">
          <Flame size={20} className={streak > 0 ? "tk-anim-flame" : ""} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-primary">{title}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <Link href="/share" className="tk-pill-btn tk-btn-soft px-3.5 py-2 text-xs">
          <Share2 size={13} /> Share
        </Link>
      </div>
      {weeklyGoal && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-blush/70 px-3 py-2.5">
          <WeeklyGoalRing days={weeklyGoal.days} target={weeklyGoal.target} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-primary">
              {weeklyGoal.days >= weeklyGoal.target ? "Weekly goal reached" : "This week's goal"}
            </p>
            <p className="text-xs text-muted">
              {weeklyGoal.days >= weeklyGoal.target
                ? "Lovely rhythm. Anything more is a bonus."
                : `${weeklyGoal.days} of ${weeklyGoal.target} days of care so far.`}
            </p>
          </div>
        </div>
      )}
      {trophies?.totalCount > 0 && (
        <Link
          href="/progress"
          className="mt-3 flex items-center gap-2 rounded-xl bg-blush/70 px-3 py-2.5 text-sm text-primary hover:bg-blush transition-colors"
        >
          <Trophy size={15} className="text-accent" />
          <span className="flex-1">{trophies.unlockedCount} of {trophies.totalCount} milestones reached</span>
          <ChevronRight size={15} className="text-muted" />
        </Link>
      )}
    </section>
  );
}

function ExploreGrid({ reportReady, showLeaderboard }) {
  const items = [
    { href: "/what-if", label: "What-If", sub: "Preview 6 months ahead", icon: Sparkles },
    { href: "/reports", label: "Reports", sub: reportReady ? "New report ready" : "Progress reports", icon: FileText, dot: reportReady },
    showLeaderboard && { href: "/leaderboard", label: "Leaderboard", sub: "Days of care this month", icon: Trophy },
    { href: "/shop", label: "Shop", sub: "Curated products", icon: ShoppingBag },
  ].filter(Boolean);
  return (
    <section data-tour="explore" aria-label="Explore" className="rounded-2xl">
      <h2 className="text-[15px] font-semibold text-primary mb-3">Explore</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {items.map(({ href, label, sub, icon: Icon, dot }) => (
          <Link
            key={href}
            href={href}
            className="tk-tile relative flex items-center gap-3 p-3 hover:border-accent/40 transition-colors"
          >
            <span className="tk-icon-circle w-9 h-9"><Icon size={17} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-primary">{label}</span>
              <span className="block tk-text-micro text-muted truncate">{sub}</span>
            </span>
            {dot && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent" aria-hidden="true" />}
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * The "Today" screen: greeting, Today/This-week toggle (the reference's
 * Skin | Hair toggle — TintKin is skin-only, so it switches the score between
 * the latest scan and the weekly average), score card, four metrics, focus,
 * plan and shortcuts. On desktop it splits into a main column and a side rail.
 */
export default function TodayView({ data, radar, banners, planCard, sinceStart, scanInvite = null, showLeaderboard = true }) {
  const [mode, setMode] = useState("today");
  const greeting = useSyncExternalStore(noopSubscribe, greetingNow, () => "Hello,");
  const week = data.weekScore;
  // Charts measure their container; mounting one inside a display:none box gives 0x0 warnings.
  const isLarge = useSyncExternalStore(subscribeLg, () => window.matchMedia(LG_QUERY).matches, () => false);

  const score = mode === "week" ? week.overall : data.score;
  // No scan yet: the plan leads and scan-based cards stay out of the way.
  const noScan = data.score == null && !data.metrics.some((m) => m.today != null);

  // One warm line per newly reached milestone, then quiet (it is persisted as
  // unlocked server-side, so a reload does not repeat it).
  const newMilestone = data.newMilestones?.[0];
  useEffect(() => {
    if (!newMilestone) return undefined;
    const t = window.setTimeout(() => kinSay(milestoneLine(newMilestone)), 1500);
    return () => window.clearTimeout(t);
  }, [newMilestone]);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem] lg:gap-x-8 lg:gap-y-6 lg:items-start">
      <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0">
        <header className="order-1">
          <p className="text-[15px] text-muted">{greeting}</p>
          <h1 className="text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-primary leading-tight truncate">
            {data.firstName || "Welcome back"}
          </h1>
          <p className="text-sm text-muted mt-0.5">Your skin story continues here.</p>
        </header>

        {banners && <div className="order-1 flex flex-col gap-3 empty:hidden">{banners}</div>}

        {planCard && <div className="order-2">{planCard}</div>}

        {noScan ? (
          scanInvite && <div className="order-3">{scanInvite}</div>
        ) : (
          <>
            <SegmentedTabs
              data-tour="toggle"
              className="order-2 lg:max-w-sm"
              label="Score view"
              value={mode}
              onChange={setMode}
              items={[
                { id: "today", label: "Today" },
                { id: "week", label: "This week" },
              ]}
            />

            <div className="order-3">
              <ScoreCard
                mode={mode}
                score={score}
                delta={data.delta}
                band={mode === "week" ? null : data.band}
                skinAgeLine={data.skinAgeLine}
                photoUrl={data.photoUrl}
                weekScans={week.scanCount}
                sinceStart={sinceStart}
              />
            </div>

            <div className="order-4">
              <MetricRow metrics={data.metrics} mode={mode} />
            </div>
          </>
        )}

        <div className="order-6">
          <PlanSection plan={data.plan} />
        </div>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0 lg:sticky lg:top-20 lg:self-start">
        {!noScan && <div className="order-5"><FocusCard focus={data.focus} /></div>}
        <div className="order-7"><StreakCard streak={data.streak} longestStreak={data.longestStreak} weeklyGoal={data.weeklyGoal} trophies={data.trophies} /></div>
        {radar && isLarge && (
          <section className="tk-card p-4 sm:p-5 order-8" aria-label="Skin profile">
            <h2 className="text-[15px] font-semibold text-primary mb-1">Skin profile</h2>
            <div className="relative h-60">{radar}</div>
          </section>
        )}
        <div className="order-9"><ExploreGrid reportReady={data.reportReady} showLeaderboard={showLeaderboard} /></div>
      </div>
    </div>
  );
}
