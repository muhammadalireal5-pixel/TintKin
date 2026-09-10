"use client";

import { useState, useEffect, useMemo } from "react";
import { getLeaderboard } from "@/app/lib/actions";
import Link from "next/link";
import {
  MapPin,
  Flag,
  Globe,
  Trophy,
  Medal,
  Flame,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronRight
} from "lucide-react";

const SCOPES = [
  { id: "city", label: "City", icon: MapPin },
  { id: "country", label: "Country", icon: Flag },
  { id: "international", label: "Global", icon: Globe },
];

export default function LeaderboardCard() {
  const [activeScope, setActiveScope] = useState("city");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    getLeaderboard(activeScope).then((res) => {
      if (isCurrent) {
        setData(res);
        setLoading(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [activeScope]);

  // Filter entries based on scope - Global users should only appear in Global tab
  const displayEntries = useMemo(() => {
    if (!data?.entries || data.entries.length === 0) return [];
    
    if (activeScope === "international") {
      // Global scope shows everyone
      return data.entries;
    } else if (activeScope === "country") {
      // Country scope: only show users from the same country, exclude global/international users
      return data.entries.filter(entry => {
        // Only include users who have a country set and match the active country
        // Exclude users flagged as global/international (those without a specific country)
        return entry.country && 
               entry.country === data.activeCountry;
      });
    } else {
      // City scope: only show users from the same city
      return data.entries.filter(entry => {
        return entry.city && 
               entry.city === data.activeCity;
      });
    }
  }, [data?.entries, activeScope, data?.activeCountry, data?.activeCity]);

  return (
    <div className="tk-glass p-4 sm:p-4.5 rounded-3xl h-full flex flex-col justify-between shadow-sm border border-black/5 overflow-hidden min-h-[250px]">
      {/* Header & Category Tabs */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Trophy size={13} className="text-amber-500" />
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted">
              Community Board
            </p>
          </div>
          {data?.userCount > 0 && !data.needsLocation && (
            <span className="text-[10px] font-medium text-muted bg-black/5 px-2 py-0.5 rounded-full">
              {data.userCount} {data.userCount === 1 ? "member" : "members"}
            </span>
          )}
        </div>

        {/* 3 Scope Tabs: City, Country, Global */}
        <div className="flex p-0.5 rounded-xl bg-black/[0.04] gap-0.5 mb-2">
          {SCOPES.map(({ id, label, icon: Icon }) => {
            const isActive = activeScope === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveScope(id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-white text-primary shadow-xs font-semibold"
                    : "text-muted hover:text-primary hover:bg-white/50"
                }`}
              >
                <Icon size={12} className={isActive ? "text-sage" : "opacity-70"} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Scope Context Label */}
        {data?.activeScopeLabel && !data.needsLocation && (
          <p className="text-[10px] text-muted mb-1 text-left truncate">
            Leaderboard for{" "}
            <span className="font-semibold text-primary">{data.activeScopeLabel}</span>
          </p>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden my-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Loader2 size={20} className="animate-spin text-sage" />
            <p className="text-xs text-muted">Loading rankings…</p>
          </div>
        ) : data?.needsLocation ? (
          <div className="text-center py-4 px-3">
            <div className="w-9 h-9 rounded-full bg-lavender/60 text-primary mx-auto flex items-center justify-center mb-2">
              <MapPin size={16} className="text-primary" />
            </div>
            <p className="text-xs font-medium text-primary mb-1">
              Location Required
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Set your city in Settings to unlock your local {activeScope} leaderboard.
            </p>
          </div>
        ) : !data?.entries || data.entries.length === 0 ? (
          <div className="text-center py-4 px-3">
            <div className="w-9 h-9 rounded-full bg-sage/10 text-sage mx-auto flex items-center justify-center mb-2">
              <Sparkles size={16} />
            </div>
            <p className="text-xs font-medium text-primary mb-1">
              Be the First!
            </p>
            <p className="text-xs text-muted leading-relaxed">
              No scans recorded for {data?.activeScopeLabel || "this area"} yet. Take today&apos;s scan to claim the #1 spot.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 h-full overflow-y-auto pr-1 scrollbar-thin">
            {displayEntries.slice(0, 10).map((entry) => {
              const isRank1 = entry.rank === 1;
              const isRank2 = entry.rank === 2;
              const isRank3 = entry.rank === 3;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-1.5 rounded-xl text-xs transition-colors ${
                    entry.isMe
                      ? "bg-sage/15 border border-sage/30 shadow-xs"
                      : "hover:bg-black/[0.02]"
                  }`}
                >
                  {/* Left: Rank & User Details */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                        isRank1
                          ? "bg-amber-100 text-amber-700 border border-amber-300 shadow-xs"
                          : isRank2
                          ? "bg-slate-200 text-slate-700 border border-slate-300"
                          : isRank3
                          ? "bg-orange-100 text-orange-700 border border-orange-300"
                          : "bg-black/5 text-muted font-medium"
                      }`}
                    >
                      {isRank1 ? (
                        <Trophy size={12} className="text-amber-700" />
                      ) : isRank2 || isRank3 ? (
                        <Medal size={12} className={isRank2 ? "text-slate-700" : "text-orange-700"} />
                      ) : (
                        entry.rank
                      )}
                    </div>

                    {/* Avatar / Initial */}
                    <div className="w-6 h-6 rounded-full bg-lavender/70 flex items-center justify-center overflow-hidden shrink-0">
                      {entry.photoURL ? (
                        <img
                          src={entry.photoURL}
                          alt={entry.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={12} className="text-primary opacity-80" />
                      )}
                    </div>

                    {/* Name & Location Tag */}
                    <div className="min-w-0 text-left">
                      <p className="font-medium text-primary truncate flex items-center gap-1.5">
                        <span className="truncate max-w-[100px] sm:max-w-[120px]">
                          {entry.displayName}
                        </span>
                        {entry.isMe && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sage text-white font-semibold shrink-0">
                            You
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Streak & Overall Score */}
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted" title={`${entry.streak} day streak`}>
                        <Flame size={12} className="text-amber-500 fill-amber-500/20" />
                        {entry.streak}d
                      </span>
                    )}
                    <span className="font-display font-semibold text-xs px-2 py-0.5 rounded-full bg-black/5 text-primary">
                      {entry.overallScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned Footer */}
      <div className="shrink-0 mt-2 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-muted">
        {data?.myRank ? (
          <span>
            Standing: <span className="font-semibold text-primary">#{data.myRank} of {data.userCount}</span>
          </span>
        ) : (
          <span>Community Board</span>
        )}
        <Link
          href="/leaderboard"
          className="text-sage hover:text-primary font-medium flex items-center gap-0.5 transition-colors"
        >
          Full Board <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
