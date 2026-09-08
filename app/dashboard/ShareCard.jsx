"use client";

import { useRef, useState } from "react";
import * as htmlToImage from "html-to-image";
import { Download, Sparkles, Check } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";

const BACKGROUND_THEMES = [
  {
    id: "green",
    name: "Sage",
    image: "/cards/green.jpeg",
    accentColor: "#5A6A3B",
    badgeBg: "bg-[#5A6A3B]/10 text-[#5A6A3B]",
    borderHover: "hover:border-[#5A6A3B]/50",
  },
  {
    id: "blue",
    name: "Ocean",
    image: "/cards/blue.jpeg",
    accentColor: "#2563EB",
    badgeBg: "bg-blue-500/10 text-blue-600",
    borderHover: "hover:border-blue-500/50",
  },
  {
    id: "pink",
    name: "Rose",
    image: "/cards/pink.jpeg",
    accentColor: "#DB2777",
    badgeBg: "bg-pink-500/10 text-pink-600",
    borderHover: "hover:border-pink-500/50",
  },
  {
    id: "light-pink",
    name: "Blossom",
    image: "/cards/light-pink.jpeg",
    accentColor: "#E11D48",
    badgeBg: "bg-rose-500/10 text-rose-600",
    borderHover: "hover:border-rose-500/50",
  },
];

export default function ShareCard({ scores, overallScore, skinAge, realAge, userName = "" }) {
  const { showToast } = useToast();
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(BACKGROUND_THEMES[0]);

  const safeScores = scores ?? {};
  const safeOverall = overallScore ?? 75;
  const safeSkinAge = skinAge ?? 25;
  const safeRealAge = realAge ?? 28;

  const ageDelta = Math.abs(safeSkinAge - safeRealAge);
  const skinYounger = safeSkinAge <= safeRealAge;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
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

  return (
    <div className="tk-glass p-6 sm:p-8 rounded-3xl w-full flex flex-col items-center">
      {/* Top Controls Header */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted">Share Progress</p>
          <p className="text-xs text-primary/70">Pick a background and download your snapshot</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition px-5 py-2.5 rounded-full shadow-md active:scale-95 disabled:opacity-50"
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

      {/* Theme Selector Tabs */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-center gap-2 bg-white/60 p-1.5 rounded-2xl border border-black/5 shadow-inner">
        {BACKGROUND_THEMES.map((theme) => {
          const isSelected = selectedTheme.id === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? "bg-white text-primary shadow-sm font-semibold border border-black/10 scale-100"
                  : "text-muted hover:text-primary hover:bg-white/40"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: theme.accentColor }}
              />
              <span>{theme.name}</span>
              {isSelected && <Check size={12} className="text-primary ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* The Printable / Exportable Card */}
      <div
        ref={cardRef}
        className="w-full max-w-sm rounded-[2.2rem] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 sm:p-7 select-none"
        style={{ minHeight: "580px" }}
      >
        {/* Background Image */}
        <img
          src={selectedTheme.image}
          alt={selectedTheme.name}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Soft Vignette Overlay for Crisp Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/20 to-black/35 pointer-events-none backdrop-blur-[1px]" />

        {/* Card Content (Relative z-10) */}
        <div className="relative z-10 flex flex-col h-full justify-between gap-5">
          {/* Top Branding & Enlarged Logo */}
          <div className="text-center pt-2">
            <div className="relative inline-block mb-3">
              <img
                src="/logo-clean.png"
                alt="TintKin Logo"
                crossOrigin="anonymous"
                className="h-9 sm:h-10 w-auto object-contain mx-auto drop-shadow-lg filter transition-transform hover:scale-105"
              />
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-sm text-[10px] font-bold tracking-widest uppercase text-primary mb-1">
              <Sparkles size={11} className="text-sage" />
              <span>Skin Longevity Journal</span>
            </div>
            {userName && (
              <p className="text-xs font-medium text-white/90 drop-shadow-sm mt-1">{userName}&apos;s Profile</p>
            )}
          </div>

          {/* Core Score Hero Pill */}
          <div className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-white/90 shadow-lg text-center mx-1">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted mb-1">Overall Skin Health</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-6xl sm:text-7xl font-display font-medium text-primary leading-none tracking-tight">
                {safeOverall}
              </span>
              <span className="text-lg text-muted font-medium">/ 100</span>
            </div>
          </div>

          {/* Real Age vs Skin Age */}
          <div className="grid grid-cols-2 gap-3 mx-1">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1">Real Age</p>
              <p className="text-2xl font-display font-medium text-primary leading-tight">{safeRealAge}</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/80 shadow-sm relative overflow-hidden">
              <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1">Skin Age</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-display font-medium text-primary leading-tight">{safeSkinAge}</p>
                {ageDelta > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      skinYounger ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {skinYounger ? `-${ageDelta}y` : `+${ageDelta}y`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Biomarkers Mini Grid */}
          <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-white/80 shadow-sm mx-1">
            <div className="grid grid-cols-4 gap-2 text-center divide-x divide-black/5">
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Wrinkles</p>
                <p className="text-sm font-bold text-primary">{safeScores.wrinkles ?? 80}</p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Firmness</p>
                <p className="text-sm font-bold text-primary">{safeScores.firmness ?? 78}</p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Spots</p>
                <p className="text-sm font-bold text-primary">{safeScores.spots ?? 82}</p>
              </div>
              <div className="px-1">
                <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">Radiance</p>
                <p className="text-sm font-bold text-primary">{safeScores.radiance ?? 85}</p>
              </div>
            </div>
          </div>

          {/* Watermark Footer */}
          <div className="pt-2 pb-1 px-2 flex items-center justify-between text-white/95 drop-shadow-md">
            <span className="text-[11px] font-medium tracking-wide">Track your skin journey</span>
            <span className="text-xs font-bold tracking-wider underline decoration-white/40">tintkin.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
