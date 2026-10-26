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
import { scoreBand } from "./skin-summary";

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

// Green / amber / red for a 0-100 metric, and for the skin-age gap. Full class
// names so Tailwind can see them.
const TONES = {
  success: { text: "text-success", bar: "bg-success" },
  warn: { text: "text-warn", bar: "bg-warn" },
  danger: { text: "text-danger", bar: "bg-danger" },
  muted: { text: "text-muted", bar: "bg-line" },
};
const metricTone = (v) => (typeof v !== "number" ? "muted" : v >= 80 ? "success" : v >= 60 ? "warn" : "danger");
const yrs = (n) => `${n} ${n === 1 ? "yr" : "yrs"}`;

function SinceChip({ mode, score, delta, startScore, weekScans }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (mode === "week") {
    return weekScans > 0 ? <span className={`${base} bg-line text-muted`}>{weekScans} {weekScans === 1 ? "scan" : "scans"} this week</span> : null;
  }
  if (typeof score !== "number") return null;
  if (typeof startScore === "number") {
    const d = score - startScore;
    if (Math.abs(d) < 0.005) return <span className={`${base} bg-line text-muted`}>0 since start</span>;
    return d > 0
      ? <span className={`${base} bg-success-soft text-success`}><ArrowUp size={11} strokeWidth={3} />+{d.toFixed(2)} since start</span>
      : <span className={`${base} bg-danger-soft text-danger`}><ArrowDown size={11} strokeWidth={3} />&minus;{Math.abs(d).toFixed(2)} since start</span>;
  }
  // No plan yet, so no starting point: compare with the last scan instead.
  if (typeof delta === "number" && delta !== 0) {
    const up = delta > 0;
    return (
      <span className={`${base} ${up ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
        {up ? <ArrowUp size={11} strokeWidth={3} /> : <ArrowDown size={11} strokeWidth={3} />}
        {Number(Math.abs(delta).toFixed(2))} vs. last scan
      </span>
    );
  }
  return null;
}

function SkinAge({ skinAge, realAge }) {
  const hasActual = typeof realAge === "number";
  const gap = hasActual ? skinAge - realAge : null;
  const tone = gap == null ? "muted" : gap <= 0 ? "success" : gap <= 10 ? "warn" : "danger";
  const gapText = gap == null ? null : gap > 0 ? `+${yrs(gap)}` : gap < 0 ? `\u2212${yrs(-gap)}` : "On par";
  return (
    <div className="text-right min-w-0" aria-label={`Skin age ${skinAge}${hasActual ? `, actual age ${realAge}` : ""}`}>
      <p className="tk-eyebrow">Skin age</p>
      <p className={`mt-1 text-[3.25rem] sm:text-[4rem] font-semibold leading-none tabular-nums ${TONES[tone].text}`}>{skinAge}</p>
      {hasActual && (
        <p className="mt-2 text-xs text-muted whitespace-nowrap">
          Actual {realAge} &middot; <span className={`font-semibold ${TONES[tone].text}`}>{gapText}</span>
        </p>
      )}
    </div>
  );
}

function MetricTile({ m, value }) {
  const tone = TONES[metricTone(value)];
  const has = typeof value === "number";
  const shown = has ? Math.round(value) : null;
  return (
    <Link
      href="/what-if"
      role="listitem"
      aria-label={`${m.fullLabel || m.label}: ${has ? shown : "not scanned yet"}. Open What-If`}
      className="tk-tile block p-3 hover:border-accent/40 transition-colors"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted truncate">{m.label}</span>
        <span className={`text-base font-semibold tabular-nums ${tone.text}`}>{has ? shown : "\u2014"}</span>
      </span>
      <span
        className="mt-2 block h-1.5 rounded-full bg-line overflow-hidden"
        role="progressbar"
        aria-label={`${m.label} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={has ? shown : undefined}
      >
        {has && <span className={`block h-full rounded-full ${tone.bar} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />}
      </span>
    </Link>
  );
}

/** One card: score and skin age side by side, then the four metrics. */
function SkinCard({ mode, score, delta, startScore, weekScans, skinAge, realAge, metrics }) {
  const label = mode === "week" ? "WEEKLY SCORE" : "SKIN SCORE";
  const has = typeof score === "number";
  const band = scoreBand(score);
  return (
    <section data-tour="score" className="tk-card p-4 sm:p-6 lg:p-8" aria-label="Skin score">
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 items-start">
        <div className="min-w-0">
          <p className="tk-eyebrow">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[3.25rem] sm:text-[4rem] font-semibold leading-none text-primary tabular-nums">
              {has ? Math.round(score) : "\u2014"}
            </span>
            <span className="text-sm text-muted">/100</span>
            {band && <span className="ml-1 text-xs font-medium text-muted whitespace-nowrap">{band}</span>}
          </div>
          <div className="mt-2 min-h-6">
            <SinceChip mode={mode} score={score} delta={delta} startScore={startScore} weekScans={weekScans} />
          </div>
        </div>
        {typeof skinAge === "number" && <SkinAge skinAge={skinAge} realAge={realAge} />}
      </div>

      <div className="my-4 h-px bg-line" />

      <div data-tour="metrics" className="grid grid-cols-2 gap-2.5 rounded-2xl" role="list" aria-label="Skin metrics">
        {metrics.map((m) => <MetricTile key={m.key} m={m} value={mode === "week" ? m.week : m.today} />)}
      </div>
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
 * the latest scan and the weekly average), the skin card (score, skin age and
 * the four metrics in one), the first-week checklist, and shortcuts. The plan
 * card is the one way into today's steps. On desktop it splits into a main
 * column and a side rail.
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
              <StreakChip align="right" streak={data.streak} longestStreak={data.longestStreak} weeklyGoal={data.weeklyGoal} trophies={data.trophies} />
            </div>
          </div>
        </header>

        {banners && <div className="order-1 flex flex-col gap-3 empty:hidden">{banners}</div>}

        {planCard && <div className="order-2">{planCard}</div>}

        {noScan ? (
          scanInvite && <div className="order-3">{scanInvite}</div>
        ) : (
          <>
            <SegmentedTabs
              data-tour="toggle"
              className="order-3 lg:max-w-sm"
              label="Score view"
              value={mode}
              onChange={setMode}
              items={[
                { id: "today", label: "Today" },
                { id: "week", label: "This week" },
              ]}
            />

            <div className="order-4">
              <SkinCard
                mode={mode}
                score={score}
                delta={data.delta}
                startScore={sinceStart?.score}
                weekScans={week.scanCount}
                skinAge={data.skinAge}
                realAge={data.realAge}
                metrics={data.metrics}
              />
            </div>
          </>
        )}

        {afterPlan && <div className="order-5 empty:hidden">{afterPlan}</div>}
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
