"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLeaderboard } from "@/app/lib/actions";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Flame,
  MapPin,
  Flag,
  Globe,
  User,
  Sparkles,
  Loader2,
  RefreshCw
} from "lucide-react";

const SCOPES = [
  { id: "city", label: "City", icon: MapPin },
  { id: "country", label: "Country", icon: Flag },
  { id: "international", label: "Global", icon: Globe },
];

export default function LeaderboardPage() {
  const [activeScope, setActiveScope] = useState("city");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBoard = (scope) => {
    setLoading(true);
    getLeaderboard(scope).then((res) => {
      setData(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchBoard(activeScope);
  }, [activeScope]);

  const topThree = data?.entries ? data.entries.slice(0, 3) : [];
  const remainingEntries = data?.entries ? data.entries.slice(3) : [];
  const myEntry = data?.entries?.find((e) => e.isMe);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lavender/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-100/40 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header with back navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-white/50 border border-white/60 flex items-center justify-center text-muted hover:text-primary hover:bg-white transition-colors shadow-sm shrink-0"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-lavender text-primary shadow-xs">
                <Trophy size={15} className="text-amber-600" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-medium text-primary truncate">
                Community Leaderboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted">
              Compare your skin harmony score and consistency streak locally, nationally, and worldwide.
            </p>
          </div>
        </div>

        {/* Scope Tabs & Stats Bar */}
        <div className="tk-glass p-3 sm:p-4 rounded-2xl mb-6 shadow-sm border border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Scope selection buttons */}
          <div className="flex p-1 rounded-xl bg-black/[0.04] gap-1 w-full sm:w-auto">
            {SCOPES.map(({ id, label, icon: Icon }) => {
              const isActive = activeScope === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveScope(id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted hover:text-primary hover:bg-white/50"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-sage" : "opacity-70"} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Active scope context pill */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {data?.activeScopeLabel && !data.needsLocation && (
              <span className="text-xs text-muted bg-white/70 px-3 py-1.5 rounded-full border border-black/5">
                Active: <span className="font-semibold text-primary">{data.activeScopeLabel}</span>
                {data?.userCount != null && ` · ${data.userCount} ${data.userCount === 1 ? "member" : "members"}`}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchBoard(activeScope)}
              disabled={loading}
              className="p-2 rounded-full hover:bg-black/5 text-muted hover:text-primary transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Current User Standings Callout */}
        {myEntry && (
          <div className="mb-6 p-4 rounded-2xl bg-sage/15 border border-sage/30 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs font-display font-bold text-sage text-base">
                #{myEntry.rank}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sage">Your Standing</p>
                <p className="text-sm font-medium text-primary">
                  You are ranked <span className="font-bold">#{myEntry.rank}</span> out of {data?.userCount} {activeScope} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {myEntry.streak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-xs font-medium text-muted shadow-xs">
                  <Flame size={14} className="text-amber-500 fill-amber-500/20" />
                  <span>{myEntry.streak} day streak</span>
                </div>
              )}
              <div className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold shadow-xs">
                Score: {myEntry.overallScore}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-sage" />
            <p className="text-sm text-muted">Updating community rankings…</p>
          </div>
        ) : data?.needsLocation ? (
          /* Location required card */
          <div className="tk-glass p-8 sm:p-12 rounded-3xl text-center max-w-md mx-auto my-8 shadow-sm border border-black/5">
            <div className="w-14 h-14 rounded-full bg-lavender/60 text-primary mx-auto flex items-center justify-center mb-4 shadow-sm">
              <MapPin size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-medium text-primary mb-1.5">
              Set Your Location to Unlock
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              Add your city to your profile to compare your progress with other skincare enthusiasts in your area.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary/90 shadow-sm transition-all"
            >
              Open Dashboard Settings
            </Link>
          </div>
        ) : !data?.entries || data.entries.length === 0 ? (
          /* Empty state */
          <div className="tk-glass p-8 sm:p-12 rounded-3xl text-center max-w-md mx-auto my-8 shadow-sm border border-black/5">
            <div className="w-14 h-14 rounded-full bg-sage/10 text-sage mx-auto flex items-center justify-center mb-4 shadow-sm">
              <Sparkles size={24} />
            </div>
            <h2 className="text-lg font-medium text-primary mb-1.5">
              Be the First on the Board!
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              No analyzed scans have been logged for {data?.activeScopeLabel || "this area"} yet. Take your skin scan to claim the #1 spot.
            </p>
            <Link
              href="/capture"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary/90 shadow-sm transition-all"
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
                  <div className={`tk-glass p-4 sm:p-5 rounded-2xl text-center flex flex-col items-center border ${topThree[1].isMe ? 'border-sage/40 bg-sage/5' : 'border-slate-200'}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center mb-2 shadow-xs">
                      <Medal size={16} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-lavender/70 flex items-center justify-center overflow-hidden mb-2 shadow-xs">
                      {topThree[1].photoURL ? (
                        <img src={topThree[1].photoURL} alt={topThree[1].displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-primary opacity-80" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary truncate max-w-full mb-1">
                      {topThree[1].displayName}
                      {topThree[1].isMe && <span className="ml-1 text-[10px] text-sage font-bold">(You)</span>}
                    </p>
                    <span className="text-lg sm:text-xl font-display font-bold text-primary">
                      {topThree[1].overallScore}
                    </span>
                    <span className="text-[10px] text-muted">2nd Place</span>
                  </div>
                ) : <div />}

                {/* 1st Place (Elevated) */}
                {topThree[0] && (
                  <div className={`tk-glass p-5 sm:p-6 rounded-2xl text-center flex flex-col items-center border-2 border-amber-300 bg-amber-50/20 shadow-md transform -translate-y-2`}>
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mb-2.5 shadow-sm">
                      <Trophy size={20} />
                    </div>
                    <div className="w-14 h-14 rounded-full bg-lavender/70 flex items-center justify-center overflow-hidden mb-2 shadow-sm">
                      {topThree[0].photoURL ? (
                        <img src={topThree[0].photoURL} alt={topThree[0].displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={22} className="text-primary opacity-80" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-primary truncate max-w-full mb-1">
                      {topThree[0].displayName}
                      {topThree[0].isMe && <span className="ml-1 text-[10px] text-sage font-bold">(You)</span>}
                    </p>
                    <span className="text-2xl sm:text-3xl font-display font-bold text-amber-700">
                      {topThree[0].overallScore}
                    </span>
                    <span className="text-[10px] text-amber-800 font-semibold tracking-wide uppercase">Champion</span>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] ? (
                  <div className={`tk-glass p-4 sm:p-5 rounded-2xl text-center flex flex-col items-center border ${topThree[2].isMe ? 'border-sage/40 bg-sage/5' : 'border-orange-200'}`}>
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 border border-orange-300 flex items-center justify-center mb-2 shadow-xs">
                      <Medal size={16} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-lavender/70 flex items-center justify-center overflow-hidden mb-2 shadow-xs">
                      {topThree[2].photoURL ? (
                        <img src={topThree[2].photoURL} alt={topThree[2].displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-primary opacity-80" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary truncate max-w-full mb-1">
                      {topThree[2].displayName}
                      {topThree[2].isMe && <span className="ml-1 text-[10px] text-sage font-bold">(You)</span>}
                    </p>
                    <span className="text-lg sm:text-xl font-display font-bold text-primary">
                      {topThree[2].overallScore}
                    </span>
                    <span className="text-[10px] text-muted">3rd Place</span>
                  </div>
                ) : <div />}
              </div>
            )}

            {/* Complete Rankings List */}
            <div className="tk-glass rounded-2xl overflow-hidden shadow-sm border border-black/5">
              <div className="p-4 border-b border-black/5 bg-black/[0.02] flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
                <span>Rank &amp; Member</span>
                <div className="flex items-center gap-6">
                  <span className="hidden sm:inline">Location</span>
                  <span>Streak</span>
                  <span>Score</span>
                </div>
              </div>

              <div className="divide-y divide-black/5">
                {data.entries.map((entry) => {
                  const isRank1 = entry.rank === 1;
                  const isRank2 = entry.rank === 2;
                  const isRank3 = entry.rank === 3;

                  return (
                    <div
                      key={entry.userId}
                      className={`p-4 flex items-center justify-between text-sm transition-colors ${
                        entry.isMe ? "bg-sage/10 font-medium" : "hover:bg-black/[0.02]"
                      }`}
                    >
                      {/* Left: Rank & User */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            isRank1
                              ? "bg-amber-100 text-amber-700 border border-amber-300"
                              : isRank2
                              ? "bg-slate-200 text-slate-700 border border-slate-300"
                              : isRank3
                              ? "bg-orange-100 text-orange-700 border border-orange-300"
                              : "bg-black/5 text-muted"
                          }`}
                        >
                          {isRank1 ? (
                            <Trophy size={14} className="text-amber-700" />
                          ) : isRank2 || isRank3 ? (
                            <Medal size={14} className={isRank2 ? "text-slate-700" : "text-orange-700"} />
                          ) : (
                            entry.rank
                          )}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-lavender/70 flex items-center justify-center overflow-hidden shrink-0">
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
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage text-white font-semibold shrink-0">
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
                              <Flame size={14} className="text-amber-500 fill-amber-500/20" />
                              <span>{entry.streak}d</span>
                            </>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </div>

                        <div className="min-w-[45px] text-right">
                          <span className="font-display font-semibold text-sm px-3 py-1 rounded-full bg-black/5 text-primary">
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
