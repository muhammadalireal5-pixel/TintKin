"use client";

import { useState, useEffect } from "react";
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
  const [error, setError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(false);

    getLeaderboard(activeScope)
      .then((res) => {
        if (isCurrent) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [activeScope]);

  // getLeaderboard() already scopes `entries` server-side to the requested
  // city/country/global filter (see app/lib/actions.js). Re-filtering here
  // against `data.activeCity`/`data.activeCountry` — fields the server never
  // returns — always evaluated to an empty list for the city and country
  // tabs, so they silently showed zero members regardless of how many
  // entries the server sent back.
  const displayEntries = data?.entries || [];

  return (
    <div className="tk-card p-4 sm:p-5 h-full flex flex-col justify-between overflow-hidden min-h-[250px]">
      {/* Header & Category Tabs */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Trophy size={13} className="text-accent" />
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted">
              Community Board
            </p>
          </div>
          {data?.userCount > 0 && !data.needsLocation && (
            <span className="text-[10px] font-medium text-accent-deep bg-accent-soft px-2 py-0.5 rounded-full">
              {data.userCount} {data.userCount === 1 ? "member" : "members"}
            </span>
          )}
        </div>

        {/* 3 Scope Tabs: City, Country, Global */}
        <div className="tk-segmented mb-2">
          {SCOPES.map(({ id, label, icon: Icon }) => {
            const isActive = activeScope === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveScope(id)}
                aria-selected={isActive}
                className="tk-segmented-item flex-1 flex items-center justify-center gap-1 !text-[11px]"
              >
                <Icon size={12} />
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
            <Loader2 size={20} className="animate-spin text-accent" />
            <p className="text-xs text-muted">Loading rankings…</p>
          </div>
        ) : error ? (
          <div className="text-center py-4 px-3">
            <div className="w-9 h-9 rounded-full bg-danger-soft text-danger mx-auto flex items-center justify-center mb-2">
              <AlertCircle size={16} />
            </div>
            <p className="text-xs font-medium text-primary mb-1">
              Couldn&apos;t load rankings
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Please try again in a moment.
            </p>
          </div>
        ) : data?.needsLocation ? (
          <div className="text-center py-4 px-3">
            <div className="w-9 h-9 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center mb-2">
              <MapPin size={16} />
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
            <div className="w-9 h-9 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center mb-2">
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
                      ? "bg-accent-soft border border-accent/40"
                      : "hover:bg-blush/40"
                  }`}
                >
                  {/* Left: Rank & User Details */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                        isRank1
                          ? "bg-accent text-white"
                          : isRank2
                          ? "bg-blush text-muted border border-line"
                          : isRank3
                          ? "bg-cocoa/10 text-cocoa border border-line"
                          : "bg-blush text-muted font-medium"
                      }`}
                    >
                      {isRank1 ? (
                        <Trophy size={12} className="text-white" />
                      ) : isRank2 || isRank3 ? (
                        <Medal size={12} className={isRank2 ? "text-muted" : "text-cocoa"} />
                      ) : (
                        entry.rank
                      )}
                    </div>

                    {/* Avatar / Initial */}
                    <div className="w-6 h-6 rounded-full bg-blush flex items-center justify-center overflow-hidden shrink-0">
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
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent text-white font-semibold shrink-0">
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
                        <Flame size={12} className="text-accent fill-accent/20" />
                        {entry.streak}d
                      </span>
                    )}
                    <span className="font-semibold text-xs px-2 py-0.5 rounded-full bg-blush text-primary">
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
      <div className="shrink-0 mt-2 pt-2 border-t border-line flex items-center justify-between text-[11px] text-muted">
        {data?.myRank ? (
          <span>
            Standing: <span className="font-semibold text-primary">#{data.myRank} of {data.userCount}</span>
          </span>
        ) : (
          <span>Community Board</span>
        )}
        <Link
          href="/leaderboard"
          className="text-accent hover:text-accent-deep font-medium flex items-center gap-0.5 transition-colors"
        >
          Full Board <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
