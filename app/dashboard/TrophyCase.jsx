"use client";

import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Sprout,
  Flame,
  CheckCircle2,
  CalendarCheck,
  Clock,
  FlaskConical,
  FileText,
  TrendingUp,
  Heart,
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
  Sprout,
  Flame,
  CheckCircle2,
  CalendarCheck,
  Clock,
  FlaskConical,
  FileText,
  TrendingUp,
  Heart,
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

// Colors come from the active theme tokens (accent, accent-soft, line, blush),
// so the cards follow whichever theme is on instead of a fixed palette.
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
  const completionPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const handleDownloadBadge = async () => {
    if (!badgeCardRef.current || !selectedBadge) return;
    setDownloading(true);
    try {
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(badgeCardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.95,
        filter: (node) => !node?.classList?.contains("no-export"),
      });
      const link = document.createElement("a");
      link.download = `tintkin-${selectedBadge.id}-milestone.png`;
      link.href = dataUrl;
      link.click();
      showToast({
        type: "success",
        title: "Milestone saved",
        message: "Your milestone card is saved to your device.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Couldn't save",
        message: "Could not export the card. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="tk-card p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-line">
        <div className="flex items-start gap-3.5">
          <div className="tk-icon-circle w-11 h-11 shrink-0">
            <Trophy size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="tk-text-micro font-bold tracking-[0.2em] uppercase text-muted">
                Milestones
              </span>
              <span className="tk-text-micro px-2 py-0.5 rounded-full bg-blush text-muted font-semibold">
                {totalCount} to reach
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-primary">
              Time you&apos;ve spent <span className="text-accent">caring for your skin</span>
            </h3>
            <p className="text-xs text-muted mt-0.5 hidden sm:block">
              Each milestone marks showing up, not a score. Tap one to see what it means.
            </p>
          </div>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1.5 shrink-0 bg-blush/60 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft text-xs font-bold text-accent-deep">
            <Award size={14} />
            <span>
              {unlockedCount} of {totalCount} reached
            </span>
          </div>
          <div className="w-28 sm:w-36 h-2 bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ribbon on mobile, grid on desktop */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scrollbar-none gap-3 sm:gap-3.5 pb-2 sm:pb-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 -mx-1 px-1 sm:mx-0 sm:px-0">
        {badgeList.map((badge) => {
          const Icon = ICON_MAP[badge.iconName] || Award;
          const isUnlocked = badge.isUnlocked;

          return (
            <button
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`group p-4 rounded-[1.25rem] text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden border shrink-0 w-[145px] sm:w-auto snap-start ${
                isUnlocked
                  ? "bg-surface shadow-sm hover:shadow-md border-line hover:border-accent/40 hover:-translate-y-1 cursor-pointer"
                  : "bg-blush/60 border-line opacity-70 hover:opacity-90 hover:-translate-y-0.5 cursor-pointer"
              }`}
              style={{ minHeight: "155px" }}
            >
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                    isUnlocked ? "bg-accent-soft text-accent" : "bg-line text-muted"
                  }`}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>
                {isUnlocked ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white bg-accent">
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-line flex items-center justify-center text-muted">
                    <Lock size={11} />
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-auto">
                <span
                  className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${
                    isUnlocked ? "bg-accent-soft text-accent-deep" : "bg-line text-muted"
                  }`}
                >
                  {badge.group}
                </span>

                <h4
                  className={`text-xs font-semibold leading-tight mb-1 line-clamp-2 ${
                    isUnlocked ? "text-primary" : "text-muted"
                  }`}
                >
                  {badge.title}
                </h4>

                <p
                  className={`tk-text-micro leading-tight truncate ${
                    isUnlocked ? "text-success font-medium" : "text-muted"
                  }`}
                >
                  {isUnlocked ? "✓ Reached" : badge.progress || badge.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-3.5 border-t border-line flex flex-col sm:flex-row items-center justify-between tk-text-micro text-muted gap-2">
        <span className="flex items-center gap-1.5">
          <Share2 size={13} className="text-accent" />
          <span>Tap a milestone to see what it means and save it as an image.</span>
        </span>
        <span className="tk-text-micro uppercase font-semibold tracking-wider text-accent">
          Showing up counts
        </span>
      </div>

      {selectedBadge && mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 bg-primary/30 animate-in fade-in"
            onClick={() => setSelectedBadge(null)}
          >
            <div
              className="w-full max-w-[390px] my-auto flex flex-col items-center animate-in zoom-in-95 duration-200 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* The exportable card */}
              <div
                ref={badgeCardRef}
                className="w-full rounded-[2rem] p-6 sm:p-7 text-center relative overflow-hidden border border-line shadow-2xl flex flex-col items-center bg-surface"
              >
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="no-export absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-blush hover:bg-line flex items-center justify-center text-muted hover:text-primary transition-colors z-20 cursor-pointer"
                  title="Close"
                >
                  <X size={15} />
                </button>

                <div className="relative z-10 pt-1 flex flex-col items-center">
                  <img
                    src="/logo-clean.png"
                    alt="TintKin"
                    crossOrigin="anonymous"
                    className="h-8 sm:h-9 w-auto object-contain mx-auto drop-shadow-xs"
                  />
                  <p className="tk-text-micro font-bold tracking-[0.24em] uppercase text-muted/80 mt-1">
                    TintKin • Milestone
                  </p>
                </div>

                <div className="relative z-10 mt-4 mb-1 flex flex-col items-center w-full">
                  <div
                    className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center relative border-3 ${
                      selectedBadge.isUnlocked ? "border-accent bg-accent-soft text-accent" : "border-line bg-blush text-muted"
                    }`}
                  >
                    {selectedBadge.isUnlocked ? (
                      React.createElement(ICON_MAP[selectedBadge.iconName] || Award, {
                        size: 38,
                        strokeWidth: 2,
                      })
                    ) : (
                      <Lock size={30} />
                    )}

                    {selectedBadge.isUnlocked && (
                      <div className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-surface shadow-md flex items-center justify-center border border-accent">
                        <Sparkles size={13} className="text-accent" />
                      </div>
                    )}
                  </div>

                  <span
                    className={`mt-3.5 px-3 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-widest ${
                      selectedBadge.isUnlocked ? "bg-accent-soft text-accent-deep" : "bg-line text-muted"
                    }`}
                  >
                    {selectedBadge.group}
                  </span>

                  <h3 className="text-xl sm:text-2xl font-semibold text-primary mt-1.5 tracking-tight">
                    {selectedBadge.title}
                  </h3>
                  <p className="text-xs text-muted max-w-[270px] mt-1 leading-relaxed">
                    {selectedBadge.description}
                  </p>
                  {selectedBadge.reward && (
                    <p className="text-xs text-accent-deep font-medium mt-2">
                      {selectedBadge.isUnlocked ? "Reward received: " : "Reward: "}
                      {selectedBadge.reward}
                    </p>
                  )}
                </div>

                <div className="relative z-10 w-full pt-3.5 mt-4 border-t border-line flex items-center justify-between tk-text-micro text-muted">
                  <div className="text-left">
                    <span className="block font-semibold uppercase tracking-wider text-[9px] text-primary/60">
                      For
                    </span>
                    <span className="font-medium text-primary tk-text-micro capitalize">{userName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold uppercase tracking-wider text-[9px] text-primary/60">
                      Status
                    </span>
                    <span className={`font-bold tk-text-micro ${selectedBadge.isUnlocked ? "text-accent" : "text-muted"}`}>
                      {selectedBadge.isUnlocked ? "Reached" : selectedBadge.progress || "In progress"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full">
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="px-5 py-3 sm:py-2.5 rounded-full text-sm sm:text-xs font-semibold tk-btn-ghost bg-surface shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Close
                </button>
                {selectedBadge.isUnlocked && (
                  <button
                    onClick={handleDownloadBadge}
                    disabled={downloading}
                    className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-full text-sm sm:text-xs font-semibold tk-btn-primary transition shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>{downloading ? "Saving…" : "Save as image"}</span>
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
