"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { getLeaderboard } from "@/app/lib/actions";
import {
  ChevronLeft,
  Trophy,
  Medal,
  Flame,
  MapPin,
  Flag,
  Globe,
  User,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle
} from "lucide-react";

const SCOPES = [
  { id: "city", label: "City", icon: MapPin },
  { id: "country", label: "Country", icon: Flag },
  { id: "international", label: "Global", icon: Globe },
];

export default function LeaderboardClient({ initialScope, initialDataPromise }) {
  const router = useRouter();
  const [activeScope, setActiveScope] = useState(initialScope);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Tracks which scope's result is still wanted, so a slow request (the
  // server-kicked initial fetch, or a previous scope click) can't clobber
  // the screen after the user has already switched to a different scope.
  const latestScopeRef = useRef(initialScope);

  const fetchBoard = (scope) => {
    latestScopeRef.current = scope;
    setLoading(true);
    setError(false);
    getLeaderboard(scope)
      .then((res) => {
        if (latestScopeRef.current !== scope) return;
        if (res?.redirectTo) {
          router.push(res.redirectTo);
          return;
        }
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (latestScopeRef.current !== scope) return;
        Sentry.captureException(err, { tags: { scope: "leaderboard-fetch-unexpected-rejection" } });
        setError(true);
        setLoading(false);
      });
  };

  // Consumes the fetch the server component already kicked off at request
  // time for the default scope, instead of only starting it after hydration.
  // A signed-in-but-not-onboarded user (reachable since /leaderboard is
  // session-gated but not onboarding-gated by proxy.js) gets redirected
  // client-side via `redirectTo` rather than getDbUser()'s own redirect(),
  // which has no effect on an unawaited, streamed promise — see
  // getDbUserOrStatus() in app/lib/actions.js.
  useEffect(() => {
    let cancelled = false;
    // `initialDataPromise` crosses the server->client boundary as a prop, so
    // on the client it's React's internal "chunk" thenable (the same object
    // `use()` reads), not a native Promise — its `.then()` exists (so `await`
    // and single-callback `.then(cb)` work) but never returns anything, so
    // chaining `.catch()` straight off it threw "Cannot read properties of
    // undefined (reading 'catch')" on every /leaderboard load. Promise.resolve
    // adopts its resolution via one `.then(resolve, reject)` call and hands
    // back a real, chainable Promise.
    Promise.resolve(initialDataPromise)
      .then((res) => {
        if (cancelled || latestScopeRef.current !== initialScope) return;
        if (res?.redirectTo) {
          router.push(res.redirectTo);
          return;
        }
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || latestScopeRef.current !== initialScope) return;
        Sentry.captureException(err, { tags: { scope: "leaderboard-initial-promise-unexpected-rejection" } });
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialDataPromise, initialScope, router]);

  const handleScopeClick = (scope) => {
    setActiveScope(scope);
    fetchBoard(scope);
  };

  const topThree = data?.entries ? data.entries.slice(0, 3) : [];
  const myEntry = data?.entries?.find((e) => e.isMe);

  return (
    <div className="w-full pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with back navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/progress"
            className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-primary hover:bg-blush transition-colors shrink-0 focus-visible:ring-2 ring-accent"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent-soft text-accent">
                <Trophy size={15} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-primary truncate">
                Community Leaderboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted">
              Compare your skin harmony score and consistency streak locally, nationally, and worldwide.
            </p>
          </div>
        </div>

        {/* Scope Tabs & Stats Bar */}
        <div className="tk-card p-3 sm:p-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Scope selection buttons */}
          <div className="tk-segmented w-full sm:w-auto">
            {SCOPES.map(({ id, label, icon: Icon }) => {
              const isActive = activeScope === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleScopeClick(id)}
                  aria-selected={isActive}
                  className="tk-segmented-item flex-1 sm:flex-initial flex items-center justify-center gap-2"
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Active scope context pill */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {data?.activeScopeLabel && !data.needsLocation && (
              <span className="tk-chip">
                Active: <span className="font-semibold text-primary">{data.activeScopeLabel}</span>
                {data?.userCount != null && ` · ${data.userCount} ${data.userCount === 1 ? "member" : "members"}`}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchBoard(activeScope)}
              disabled={loading}
              className="p-2 rounded-full hover:bg-blush text-muted hover:text-primary transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Current User Standings Callout */}
        {myEntry && (
          <div className="mb-5 p-4 rounded-[1.25rem] bg-accent-soft border border-accent/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center font-semibold text-accent text-base">
                #{myEntry.rank}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-deep">Your Standing</p>
                <p className="text-sm font-medium text-primary">
                  You are ranked <span className="font-bold">#{myEntry.rank}</span> out of {data?.userCount} {activeScope} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {myEntry.streak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-xs font-medium text-muted">
                  <Flame size={14} className="text-accent fill-accent/20" />
                  <span>{myEntry.streak} day streak</span>
                </div>
              )}
              <div className="px-3 py-1 rounded-full bg-accent text-white text-xs font-semibold">
                Score: {myEntry.overallScore}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-accent" />
            <p className="text-sm text-muted">Updating community rankings…</p>
          </div>
        ) : error ? (
          /* Error state */
          <div className="tk-card p-8 sm:p-12 text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-full bg-danger-soft text-danger mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-semibold text-primary mb-1.5">
              Couldn&apos;t Load Rankings
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              Something went wrong fetching the leaderboard. Please try again.
            </p>
            <button
              type="button"
              onClick={() => fetchBoard(activeScope)}
              className="tk-pill-btn tk-btn-primary inline-flex items-center justify-center"
            >
              Try Again
            </button>
          </div>
        ) : data?.needsLocation ? (
          /* Location required card */
          <div className="tk-card p-8 sm:p-12 text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center mb-4">
              <MapPin size={24} />
            </div>
            <h2 className="text-lg font-semibold text-primary mb-1.5">
              Set Your Location to Unlock
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              Add your city to your profile to compare your progress with other skincare enthusiasts in your area.
            </p>
            <Link
              href="/progress"
              className="tk-pill-btn tk-btn-primary inline-flex items-center justify-center"
            >
              Open Dashboard Settings
            </Link>
          </div>
        ) : !data?.entries || data.entries.length === 0 ? (
          /* Empty state */
          <div className="tk-card p-8 sm:p-12 text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center mb-4">
              <Sparkles size={24} />
            </div>
            <h2 className="text-lg font-semibold text-primary mb-1.5">
              Be the First on the Board!
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              No analyzed scans have been logged for {data?.activeScopeLabel || "this area"} yet. Take your skin scan to claim the #1 spot.
            </p>
            <Link
              href="/capture"
              className="tk-pill-btn tk-btn-primary inline-flex items-center justify-center"
            >
              Take a Skin Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top 3 Podium (Shown on medium and larger screens if 2 or more users) */}
            {data.entries.length >= 2 && (
              <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end pt-4 pb-2">
                {/* 2nd Place */}
                {topThree[1] ? (
                  <div className={`tk-card p-4 sm:p-5 text-center flex flex-col items-center ${topThree[1].isMe ? '!border-accent !bg-accent-soft' : '!bg-blush'}`}>
                    <div className="w-8 h-8 rounded-full bg-surface text-muted border border-line flex items-center justify-center mb-2">
                      <Medal size={16} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blush flex items-center justify-center overflow-hidden mb-2">
                      {topThree[1].photoURL ? (
                        <img src={topThree[1].photoURL} alt={topThree[1].displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-primary opacity-80" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary truncate max-w-full mb-1">
                      {topThree[1].displayName}
                      {topThree[1].isMe && <span className="ml-1 text-[10px] text-accent font-bold">(You)</span>}
                    </p>
                    <span className="text-lg sm:text-xl font-semibold text-primary">
                      {topThree[1].overallScore}
                    </span>
                    <span className="text-[10px] text-muted">2nd Place</span>
                  </div>
                ) : <div />}

                {/* 1st Place (Elevated) */}
                {topThree[0] && (
                  <div className={`tk-card p-5 sm:p-6 text-center flex flex-col items-center !border-2 !border-accent !bg-accent-soft transform -translate-y-2`}>
                    <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center mb-2.5">
                      <Trophy size={20} />
                    </div>
                    <div className="w-14 h-14 rounded-full bg-blush flex items-center justify-center overflow-hidden mb-2">
                      {topThree[0].photoURL ? (
                        <img src={topThree[0].photoURL} alt={topThree[0].displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={22} className="text-primary opacity-80" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-primary truncate max-w-full mb-1">
                      {topThree[0].displayName}
                      {topThree[0].isMe && <span className="ml-1 text-[10px] text-accent font-bold">(You)</span>}
                    </p>
                    <span className="text-2xl sm:text-3xl font-semibold text-accent">
                      {topThree[0].overallScore}
                    </span>
                    <span className="text-[10px] text-accent-deep font-semibold tracking-wide uppercase">Champion</span>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] ? (
                  <div className={`tk-card p-4 sm:p-5 text-center flex flex-col items-center ${topThree[2].isMe ? '!border-accent !bg-accent-soft' : '!bg-cocoa/10'}`}>
                    <div className="w-8 h-8 rounded-full bg-surface text-cocoa border border-line flex items-center justify-center mb-2">
                      <Medal size={16} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blush flex items-center justify-center overflow-hidden mb-2">
                      {topThree[2].photoURL ? (
                        <img src={topThree[2].photoURL} alt={topThree[2].displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-primary opacity-80" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary truncate max-w-full mb-1">
                      {topThree[2].displayName}
                      {topThree[2].isMe && <span className="ml-1 text-[10px] text-accent font-bold">(You)</span>}
                    </p>
                    <span className="text-lg sm:text-xl font-semibold text-primary">
                      {topThree[2].overallScore}
                    </span>
                    <span className="text-[10px] text-muted">3rd Place</span>
                  </div>
                ) : <div />}
              </div>
            )}

            {/* Complete Rankings List */}
            <div className="tk-card overflow-hidden">
              <div className="p-4 border-b border-line bg-blush/50 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
                <span>Rank &amp; Member</span>
                <div className="flex items-center gap-6">
                  <span className="hidden sm:inline">Location</span>
                  <span>Streak</span>
                  <span>Score</span>
                </div>
              </div>

              <div className="divide-y divide-line">
                {data.entries.map((entry) => {
                  const isRank1 = entry.rank === 1;
                  const isRank2 = entry.rank === 2;
                  const isRank3 = entry.rank === 3;

                  return (
                    <div
                      key={entry.userId}
                      className={`p-4 flex items-center justify-between text-sm transition-colors ${
                        entry.isMe ? "bg-accent-soft font-medium shadow-[inset_3px_0_0_var(--tk-accent)]" : "hover:bg-blush/40"
                      }`}
                    >
                      {/* Left: Rank & User */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            isRank1
                              ? "bg-accent text-white"
                              : isRank2
                              ? "bg-blush text-muted border border-line"
                              : isRank3
                              ? "bg-cocoa/10 text-cocoa border border-line"
                              : "bg-blush text-muted"
                          }`}
                        >
                          {isRank1 ? (
                            <Trophy size={14} className="text-white" />
                          ) : isRank2 || isRank3 ? (
                            <Medal size={14} className={isRank2 ? "text-muted" : "text-cocoa"} />
                          ) : (
                            entry.rank
                          )}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-blush flex items-center justify-center overflow-hidden shrink-0">
                          {entry.photoURL ? (
                            <img src={entry.photoURL} alt={entry.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User size={15} className="text-primary opacity-80" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-primary truncate flex items-center gap-2">
                            <span className="truncate max-w-[140px] sm:max-w-[220px]">
                              {entry.displayName}
                            </span>
                            {entry.isMe && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-white font-semibold shrink-0">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted sm:hidden">
                            {entry.city || entry.country || "Global"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Location, Streak & Score */}
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="hidden sm:flex items-center gap-1 text-xs text-muted max-w-[140px] truncate">
                          <MapPin size={13} className="shrink-0 opacity-60" />
                          <span className="truncate">{entry.city || entry.country || "Worldwide"}</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted min-w-[50px]">
                          {entry.streak > 0 ? (
                            <>
                              <Flame size={14} className="text-accent fill-accent/20" />
                              <span>{entry.streak}d</span>
                            </>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </div>

                        <div className="min-w-[45px] text-right">
                          <span className="font-semibold text-sm px-3 py-1 rounded-full bg-blush text-primary">
                            {entry.overallScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
