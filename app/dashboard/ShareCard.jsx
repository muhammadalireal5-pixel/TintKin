"use client";

import { useRef, useState } from "react";
import { Download, Share2, Sparkles, Check } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import { SKIN_METRICS } from "@/lib/constants/metrics";

const BACKGROUND_THEMES = [
  {
    id: "peach",
    name: "Peach",
    background: "linear-gradient(160deg, #FCF4F2 0%, #F8DCE1 100%)",
    accentColor: "#B5546A",
  },
  {
    id: "blush",
    name: "Blush",
    background: "linear-gradient(160deg, #FFFBFA 0%, #F6E2E2 100%)",
    accentColor: "#D98A9A",
  },
  {
    id: "clay",
    name: "Clay",
    background: "linear-gradient(160deg, #F8DCE1 0%, #E8B4BF 100%)",
    accentColor: "#9A4156",
  },
  {
    id: "cocoa",
    name: "Cocoa",
    background: "linear-gradient(160deg, #F3D3D9 0%, #C27A8B 100%)",
    accentColor: "#6B3342",
  },
];

export default function ShareCard({ scores, overallScore, skinAge, realAge, userName = "" }) {
  const { showToast } = useToast();
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(BACKGROUND_THEMES[0]);

  const hasValidScore = typeof overallScore === "number";
  const safeScores = scores ?? {};
  const hasSkinAge = typeof skinAge === "number";
  const hasRealAge = typeof realAge === "number";
  const hasBothAges = hasSkinAge && hasRealAge;
  const ageDelta = hasBothAges ? Math.abs(skinAge - realAge) : 0;
  const skinYounger = hasBothAges ? skinAge <= realAge : false;

  const handleDownload = async () => {
    if (!cardRef.current || !hasValidScore) return;
    setLoading(true);
    try {
      const htmlToImage = await import("html-to-image");
      // Ensure all images within the card are loaded before capture
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5, // Crisp high-res export for social media
        quality: 0.95,
      });
      const link = document.createElement("a");
      link.download = `tintkin-skin-card-${selectedTheme.id}.png`;
      link.href = dataUrl;
      link.click();
      showToast({ type: "success", title: "Card Downloaded!", message: "Your skin health card is ready to share." });
    } catch (err) {
      showToast({ type: "error", title: "Download Failed", message: "Could not generate image. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || !hasValidScore) return;
    setLoading(true);
    try {
      const htmlToImage = await import("html-to-image");
      const blob = await htmlToImage.toBlob(cardRef.current, { cacheBust: true, pixelRatio: 2.5 });
      const file = blob ? new File([blob], `tintkin-skin-card-${selectedTheme.id}.png`, { type: "image/png" }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My TintKin skin card" });
      } else {
        setLoading(false);
        await handleDownload();
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        showToast({ type: "error", title: "Share Failed", message: "Could not share the card. Try downloading it instead." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tk-card p-5 sm:p-8 rounded-3xl w-full flex flex-col items-center">
      {/* Top Controls Header */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted">Share Progress</p>
          <p className="text-xs text-muted">
            {hasValidScore ? "Pick a background and download your snapshot" : "Complete a skin scan to unlock your share card"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleShare}
            disabled={loading || !hasValidScore}
            className="tk-pill-btn tk-btn-primary text-sm px-6 py-3 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 size={15} /> Share
          </button>
          <button
            onClick={handleDownload}
            disabled={loading || !hasValidScore}
            title={!hasValidScore ? "Complete a skin scan to download card" : undefined}
            className="tk-pill-btn tk-btn-ghost text-sm px-6 py-3 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              "Rendering..."
            ) : (
              <>
                <Download size={15} /> Download Card
              </>
            )}
          </button>
        </div>
      </div>

      {/* Theme Selector Tabs */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-center gap-2 bg-white p-1.5 rounded-full border border-line">
        {BACKGROUND_THEMES.map((theme) => {
          const isSelected = selectedTheme.id === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? "bg-accent-soft text-accent-deep font-semibold border border-accent/30"
                  : "text-muted hover:text-primary hover:bg-blush"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-line shrink-0"
                style={{ backgroundColor: theme.accentColor }}
              />
              <span>{theme.name}</span>
              {isSelected && <Check size={12} className="text-accent ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* The Printable / Exportable Card */}
      <div
        ref={cardRef}
        className="w-full max-w-sm rounded-[2.2rem] shadow-xl relative overflow-hidden flex flex-col justify-between p-6 sm:p-7 select-none"
        style={{ minHeight: "580px", background: selectedTheme.background }}
      >
        {/* Decorative soft circles (inline-styled so html-to-image captures them) */}
        <div
          className="absolute pointer-events-none"
          style={{ top: -70, right: -70, width: 220, height: 220, borderRadius: "9999px", background: "rgba(255,255,255,0.45)" }}
        />
        <div
          className="absolute pointer-events-none"
          style={{ bottom: -90, left: -60, width: 240, height: 240, borderRadius: "9999px", background: "rgba(181, 84, 106,0.12)" }}
        />

        {/* Card Content (Relative z-10) */}
        <div className="relative z-10 flex flex-col h-full justify-between gap-5">
          {/* Top Branding & Enlarged Logo */}
          <div className="text-center pt-2">
            <div className="mb-3">
              <span
                style={{ fontFamily: "var(--font-wordmark)", fontWeight: 600, fontSize: 34, lineHeight: 1, color: "#6B3342", letterSpacing: "-0.01em" }}
              >
                tintkin
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-[#EFDCDC] shadow-sm tk-text-micro font-bold tracking-widest uppercase text-primary mb-1">
              <Sparkles size={11} className="text-accent" />
              <span>Skin Longevity Journal</span>
            </div>
            {userName && (
              <p className="text-xs font-medium text-cocoa mt-1">{userName}&apos;s Profile</p>
            )}
          </div>

          {/* Core Score Hero Pill */}
          <div className="bg-white p-6 rounded-3xl border border-[#EFDCDC] shadow-lg text-center mx-1">
            <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted mb-1">Overall Skin Health</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-6xl sm:text-7xl font-semibold text-primary leading-none tracking-tight">
                {hasValidScore ? overallScore : "—"}
              </span>
              {hasValidScore && <span className="text-lg text-muted font-medium">/ 100</span>}
            </div>
          </div>

          {/* Real Age vs Skin Age */}
          <div className="grid grid-cols-2 gap-3 mx-1">
            <div className="bg-white p-4 rounded-2xl border border-[#EFDCDC] shadow-sm">
              <p className="tk-text-micro uppercase tracking-widest text-muted font-semibold mb-1">Real Age</p>
              <p className="text-2xl font-semibold text-primary leading-tight">{hasRealAge ? realAge : "—"}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#EFDCDC] shadow-sm relative overflow-hidden">
              <p className="tk-text-micro uppercase tracking-widest text-muted font-semibold mb-1">Skin Age</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-primary leading-tight">{hasSkinAge ? skinAge : "—"}</p>
                {hasBothAges && ageDelta > 0 && (
                  <span
                    className={`tk-text-micro px-1.5 py-0.5 rounded-full font-bold ${
                      skinYounger ? "bg-success-soft text-success" : "bg-accent-soft text-accent-deep"
                    }`}
                  >
                    {skinYounger ? `-${ageDelta}y` : `+${ageDelta}y`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Biomarkers Mini Grid */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#EFDCDC] shadow-sm mx-1">
            <div className="grid grid-cols-4 gap-2 text-center divide-x divide-[#EFDCDC]">
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Wrinkles</p>
                <p className="text-sm font-bold text-primary">
                  {typeof safeScores[SKIN_METRICS.WRINKLES] === "number" ? safeScores[SKIN_METRICS.WRINKLES] : "—"}
                </p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Firmness</p>
                <p className="text-sm font-bold text-primary">
                  {typeof safeScores[SKIN_METRICS.FIRMNESS] === "number" ? safeScores[SKIN_METRICS.FIRMNESS] : "—"}
                </p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Spots</p>
                <p className="text-sm font-bold text-primary">
                  {typeof safeScores[SKIN_METRICS.SPOTS] === "number" ? safeScores[SKIN_METRICS.SPOTS] : "—"}
                </p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Radiance</p>
                <p className="text-sm font-bold text-primary">
                  {typeof safeScores[SKIN_METRICS.RADIANCE] === "number" ? safeScores[SKIN_METRICS.RADIANCE] : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Watermark Footer */}
          <div className="pt-2 pb-1 px-2 flex items-center justify-between text-cocoa">
            <span className="tk-text-micro font-medium tracking-wide">Track your skin journey</span>
            <span className="text-xs font-bold tracking-wider underline decoration-[#B5546A]/40">tintkin.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
