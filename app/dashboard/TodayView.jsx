"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  FileText,
  Trophy,
  Flame,
  Share2,
  ScanFace,
} from "lucide-react";
import SegmentedTabs from "@/app/components/ui/SegmentedTabs";
import StreakChip from "./StreakChip";
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

function ScoreCard({ mode, score, delta, band, skinAgeLine, weekScans, sinceStart }) {
  const label = mode === "week" ? "WEEKLY SKIN SCORE" : "SKIN SCORE";
  // The skin age number sits next to the name; here only how it compares.
  const ageNote = skinAgeLine?.replace(/^Skin age d+s*(·s*)?/, "") || "";
  return (
    <section data-tour="score" className="tk-card p-5 sm:p-6 lg:p-8" aria-label="Skin score">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="tk-eyebrow">{label}</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[3.25rem] sm:text-[4rem] lg:text-[5rem] font-semibold leading-none text-primary tabular-nums">
              {typeof score === "number" ? score : "—"}
            </span>
            <span className="text-lg lg:text-2xl text-muted">/ 100</span>
          </div>
        </div>
        {band && mode !== "week" && <span className="text-sm font-semibold text-success pb-1.5 text-right">{band}</span>}
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
      </div>

      {ageNote && <p className="mt-3 text-sm text-muted leading-snug">{ageNote}</p>}
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

function ExploreGrid({ reportReady, showLeaderboard }) {
  const items = [
    { href: "/what-if", label: "What-If", sub: "Preview 6 months ahead", icon: Sparkles },
    { href: "/reports", label: "Reports", sub: reportReady ? "New report ready" : "Progress reports", icon: FileText, dot: reportReady },
    showLeaderboard && { href: "/leaderboard", label: "Leaderboard", sub: "Days of care this month", icon: Trophy },
    { href: "/shop", label: "Shop", sub: "Curated products", icon: ShoppingBag },
  ].filter(Boolean);
  return (
    <section data-tour="explore" aria-label="Explore" className="rounded-2xl">
      <h2 className="text-base font-semibold text-primary mb-3">Explore</h2>
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
 * the latest scan and the weekly average), score card, four metrics,
 * and shortcuts (the plan card is the one way into today's steps). On desktop it splits into a main column and a side rail.
 */
export default function TodayView({ data, radar, banners, planCard, afterPlan = null, sinceStart, scanInvite = null, showLeaderboard = true }) {
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
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">{greeting}</p>
              <h1 className="text-[2rem] sm:text-4xl lg:text-5xl font-semibold text-primary leading-tight truncate">
                {data.firstName || "Welcome back"}
              </h1>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              {!noScan && data.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.photoUrl} alt="Your latest scan" referrerPolicy="no-referrer" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover object-center border-2 border-paper shadow-[0_6px_16px_-6px_rgb(var(--tk-ink-rgb)/0.45)]" />
              )}
              <div className="flex flex-col items-end gap-1.5">
                {typeof data.skinAge === "number" && (
                  <p className="text-right leading-none" aria-label={`Skin age ${data.skinAge}`}>
                    <span className="tk-eyebrow block">Skin age</span>
                    <span className="block text-2xl sm:text-3xl font-semibold text-accent-deep tabular-nums mt-1">{data.skinAge}</span>
                  </p>
                )}
                <StreakChip align="right" streak={data.streak} longestStreak={data.longestStreak} weeklyGoal={data.weeklyGoal} trophies={data.trophies} />
              </div>
            </div>
          </div>
        </header>

        {banners && <div className="order-1 flex flex-col gap-3 empty:hidden">{banners}</div>}

        {planCard && <div className="order-2">{planCard}</div>}
        {afterPlan && <div className="order-2">{afterPlan}</div>}

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
                weekScans={week.scanCount}
                sinceStart={sinceStart}
              />
            </div>

            <div className="order-4">
              <MetricRow metrics={data.metrics} mode={mode} />
            </div>
          </>
        )}

      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-5 lg:min-w-0 lg:sticky lg:top-20 lg:self-start">
        {radar && isLarge && (
          <section className="tk-card p-4 sm:p-5 order-8" aria-label="Skin profile">
            <h2 className="text-base font-semibold text-primary mb-1">Skin profile</h2>
            <div className="relative h-60">{radar}</div>
          </section>
        )}
        <div className="order-9"><ExploreGrid reportReady={data.reportReady} showLeaderboard={showLeaderboard} /></div>
      </div>
    </div>
  );
}
