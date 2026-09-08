"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import * as htmlToImage from "html-to-image";
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Zap,
  FlaskConical,
  Crown,
  Award,
  Lock,
  Download,
  X,
  Share2,
  Check,
  Trophy,
} from "lucide-react";
import { ACHIEVEMENTS } from "@/app/lib/achievements";
import { useToast } from "@/app/components/ToastProvider";

const ICON_MAP = {
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Zap,
  FlaskConical,
  Crown,
  Award,
};

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function TrophyCase({
  badges = [],
  achievements = null,
  achievementStats = null,
  userName = "Wellness Seeker",
}) {
  const mounted = useMounted();
  const { showToast } = useToast();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const badgeCardRef = useRef(null);

  // Close on Escape key & lock scroll when modal is active
  useEffect(() => {
    if (selectedBadge) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setSelectedBadge(null);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [selectedBadge]);

  // Fallback to evaluating from ACHIEVEMENTS if not passed directly
  const badgeList =
    achievements ||
    ACHIEVEMENTS.map((ach) => ({
      ...ach,
      isUnlocked: (badges || []).includes(ach.id) || (badges || []).includes(ach.title),
    }));

  const unlockedCount =
    achievementStats?.unlockedCount ?? badgeList.filter((b) => b.isUnlocked).length;
  const totalCount = achievementStats?.totalCount ?? ACHIEVEMENTS.length;
  const completionPercent = Math.round((unlockedCount / totalCount) * 100);

  const handleDownloadBadge = async () => {
    if (!badgeCardRef.current || !selectedBadge) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(badgeCardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.95,
        filter: (node) => !node?.classList?.contains("no-export"),
      });
      const link = document.createElement("a");
      link.download = `tintkin-${selectedBadge.id}-achievement.png`;
      link.href = dataUrl;
      link.click();
      showToast({
        type: "success",
        title: "Achievement Downloaded!",
        message: "Your achievement card is saved and ready to share.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Download Failed",
        message: "Could not export badge. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="tk-glass p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between">
      {/* Landscape Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-black/[0.06]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sage/15 border border-sage/20 flex items-center justify-center shrink-0 text-sage shadow-sm">
            <Trophy size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted">
                Trophy Case
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 text-muted font-semibold">
                7 Milestones
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-medium text-primary">
              Milestones &amp; <span className="italic text-sage">Longevity</span>
            </h3>
            <p className="text-xs text-muted mt-0.5 hidden sm:block">
              Unlock badges by logging scans, completing routines, and exploring simulations. Click any badge to inspect &amp; share.
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1.5 shrink-0 bg-white/50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-black/5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sage/15 border border-sage/30 text-xs font-bold text-sage shadow-sm">
            <Award size={14} />
            <span>
              {unlockedCount} of {totalCount} Unlocked ({completionPercent}%)
            </span>
          </div>
          <div className="w-28 sm:w-36 h-2 bg-black/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-sage rounded-full transition-all duration-700 ease-out"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 7-Badge Ribbon on mobile, Landscape Grid on desktop */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none gap-3 sm:gap-3.5 pb-2 sm:pb-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 -mx-1 px-1 sm:mx-0 sm:px-0">
        {badgeList.map((badge) => {
          const Icon = ICON_MAP[badge.iconName] || Award;
          const isUnlocked = badge.isUnlocked;

          return (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`group p-4 rounded-2xl text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden border shrink-0 w-[145px] sm:w-auto snap-start ${
                isUnlocked
                  ? "bg-white/80 hover:bg-white shadow-sm hover:shadow-md border-black/10 hover:border-black/20 hover:-translate-y-1 cursor-pointer"
                  : "bg-black/[0.02] border-black/5 opacity-60 hover:opacity-85 hover:-translate-y-0.5 cursor-pointer"
              }`}
              style={{ minHeight: "155px" }}
            >
              {/* Subtle radial glow background for unlocked items */}
              {isUnlocked && (
                <div
                  className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity"
                  style={{ backgroundColor: badge.accentColor }}
                />
              )}

              {/* Icon & Status Pill */}
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: isUnlocked ? `${badge.accentColor}1A` : "rgba(0,0,0,0.04)",
                    color: isUnlocked ? badge.accentColor : "#94A3B8",
                  }}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>
                {isUnlocked ? (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: badge.accentColor }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center text-muted">
                    <Lock size={11} />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="relative z-10 mt-auto">
                <span
                  className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 shadow-2xs"
                  style={{
                    backgroundColor: isUnlocked ? `${badge.accentColor}15` : "rgba(0,0,0,0.05)",
                    color: isUnlocked ? badge.accentColor : "#64748B",
                  }}
                >
                  {badge.rarity}
                </span>

                <h4
                  className={`text-xs font-display font-semibold leading-tight mb-1 line-clamp-2 ${
                    isUnlocked ? "text-primary" : "text-muted"
                  }`}
                >
                  {badge.title}
                </h4>

                <p
                  className={`text-[10px] leading-tight truncate ${
                    isUnlocked ? "text-emerald-700 font-medium" : "text-muted"
                  }`}
                >
                  {isUnlocked ? "✓ Unlocked" : badge.progress || badge.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-3.5 border-t border-black/[0.05] flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted gap-2">
        <span className="flex items-center gap-1.5">
          <Share2 size={13} className="text-sage" />
          <span>Click any badge to view the full certificate and export as a shareable PNG image.</span>
        </span>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-sage">
          TintKin Longevity Gamification
        </span>
      </div>

      {/* Achievement Certificate Modal (Pure HTML + Exportable PNG) */}
      {selectedBadge && mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-stone-900/15 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 animate-in fade-in"
            onClick={() => setSelectedBadge(null)}
          >
            <div
              className="w-full max-w-[390px] flex flex-col items-center animate-in zoom-in-95 duration-200 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* The Exportable HTML Certificate Card (Golden Ratio Proportions & Swiss Typographic Rhythm) */}
              <div
                ref={badgeCardRef}
                className="w-full rounded-[2rem] p-6 sm:p-7 text-center relative overflow-hidden border shadow-2xl flex flex-col items-center bg-gradient-to-b from-[#FAF8F5] via-white to-[#F5F2EB]"
                style={{
                  borderColor: selectedBadge.isUnlocked ? `${selectedBadge.accentColor}40` : "#E2E8F0",
                }}
              >
                {/* Close Button inside card top-right (excluded from PNG export) */}
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="no-export absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-muted hover:text-primary transition-colors z-20 cursor-pointer"
                  title="Close"
                >
                  <X size={15} />
                </button>

                {/* Header Branding: Clean trimmed logo without dead transparent padding */}
                <div className="relative z-10 pt-1 flex flex-col items-center">
                  <img
                    src="/logo-clean.png"
                    alt="TintKin"
                    crossOrigin="anonymous"
                    className="h-8 sm:h-9 w-auto object-contain mx-auto drop-shadow-xs"
                  />
                  <p className="text-[10px] font-bold tracking-[0.24em] uppercase text-muted/80 mt-1">
                    TintKin • Skin Longevity Award
                  </p>
                </div>

                {/* Center Medallion: Golden Ratio Focal Anchor */}
                <div className="relative z-10 mt-4 mb-1 flex flex-col items-center w-full">
                  {/* Radial Halo Glow centered on Medallion */}
                  <div
                    className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-30"
                    style={{ backgroundColor: selectedBadge.accentColor }}
                  />

                  {/* Medallion Ring */}
                  <div
                    className="w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center relative shadow-lg border-3 transition-transform"
                    style={{
                      borderColor: selectedBadge.isUnlocked ? selectedBadge.accentColor : "#CBD5E1",
                      backgroundColor: selectedBadge.isUnlocked
                        ? `${selectedBadge.accentColor}12`
                        : "#F1F5F9",
                      color: selectedBadge.isUnlocked ? selectedBadge.accentColor : "#94A3B8",
                    }}
                  >
                    {selectedBadge.isUnlocked ? (
                      React.createElement(ICON_MAP[selectedBadge.iconName] || Award, {
                        size: 38,
                        strokeWidth: 2,
                      })
                    ) : (
                      <Lock size={30} />
                    )}

                    {/* Sparkle badge pip */}
                    {selectedBadge.isUnlocked && (
                      <div
                        className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center border"
                        style={{ borderColor: selectedBadge.accentColor }}
                      >
                        <Sparkles size={13} style={{ color: selectedBadge.accentColor }} />
                      </div>
                    )}
                  </div>

                  {/* Rarity & Title Typography */}
                  <span
                    className="mt-3.5 px-3 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-widest shadow-2xs"
                    style={{
                      backgroundColor: selectedBadge.isUnlocked
                        ? `${selectedBadge.accentColor}18`
                        : "#E2E8F0",
                      color: selectedBadge.isUnlocked ? selectedBadge.accentColor : "#64748B",
                    }}
                  >
                    {selectedBadge.isUnlocked ? `${selectedBadge.rarity} Badge` : "Locked Badge"}
                  </span>

                  <h3 className="text-xl sm:text-2xl font-display font-medium text-primary mt-1.5 tracking-tight">
                    {selectedBadge.title}
                  </h3>
                  <p className="text-xs text-muted max-w-[270px] mt-1 leading-relaxed">
                    {selectedBadge.description}
                  </p>
                </div>

                {/* Certificate Footer Details */}
                <div className="relative z-10 w-full pt-3.5 mt-4 border-t border-black/[0.06] flex items-center justify-between text-[10px] text-muted">
                  <div className="text-left">
                    <span className="block font-semibold uppercase tracking-wider text-[9px] text-primary/60">
                      Recipient
                    </span>
                    <span className="font-medium text-primary text-[11px] capitalize">{userName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold uppercase tracking-wider text-[9px] text-primary/60">
                      Status
                    </span>
                    <span
                      className="font-bold text-[11px]"
                      style={{ color: selectedBadge.isUnlocked ? selectedBadge.accentColor : "#64748B" }}
                    >
                      {selectedBadge.isUnlocked ? "Unlocked & Verified" : "In Progress"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Action Buttons beneath the card */}
              <div className="mt-4 flex items-center justify-center gap-2.5 w-full">
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-primary bg-white/90 hover:bg-white border border-white/80 shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                >
                  Close
                </button>
                {selectedBadge.isUnlocked && (
                  <button
                    onClick={handleDownloadBadge}
                    disabled={downloading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition shadow-lg shadow-black/10 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>{downloading ? "Rendering PNG..." : "Download Badge PNG"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
