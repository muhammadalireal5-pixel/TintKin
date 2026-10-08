"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import * as Sentry from "@sentry/nextjs";
import { Download, Share2, Clock, Sparkles, TrendingUp, TrendingDown, Minus, Loader2, Image as ImageIcon, Copy, MessageCircle, FileText } from "lucide-react";
import AnimatedModal from "@/app/components/AnimatedModal";
import { useToast } from "@/app/components/ToastProvider";
import { jpegToPdf, dataUrlToBytes } from "@/lib/utils/pdf";

const SHEET_WIDTH = 794; // A4 at 96dpi

function parseMetric(highlight) {
  const match = /^(.+?):\s*(\d+)\s*\/\s*100$/.exec(highlight || "");
  return match ? { name: match[1], score: Number(match[2]) } : null;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function TrendPill({ trend, value }) {
  if (!trend) return null;
  const config = {
    improving: { Icon: TrendingUp, label: `Improving${value ? ` +${value}` : ""}`, cls: "bg-sage/15 text-[#5E6B3A]" },
    declining: { Icon: TrendingDown, label: `Dipped${value ? ` −${value}` : ""}`, cls: "bg-[#FFDAB9]/60 text-[#9A5B2E]" },
    stable: { Icon: Minus, label: "Stable", cls: "bg-lavender text-primary" },
  }[trend];
  if (!config) return null;
  const { Icon, label, cls } = config;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

/** Print-styled sheet rendered off-screen only while exporting. */
function ReportSheet({ report, userName, sheetRef }) {
  const metrics = report.highlights.map(parseMetric).filter(Boolean);
  const trendText = { improving: "Improving", declining: "Dipped", stable: "Stable" }[report.trend] || "—";

  return (
    <div
      ref={sheetRef}
      style={{
        width: SHEET_WIDTH,
        padding: "56px 64px",
        background: "#FDFBF7",
        color: "#2C3E50",
        fontFamily: "var(--font-outfit), 'Outfit', system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(44,62,80,0.1)", paddingBottom: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-clean.png" alt="TintKin" style={{ height: 36, width: "auto" }} />
        <div style={{ textAlign: "right", fontSize: 12, color: "#5B6D7F" }}>
          <div style={{ fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 10 }}>Weekly Skin Report</div>
          <div style={{ marginTop: 4 }}>{formatDate(report.date)}</div>
        </div>
      </div>

      <h1 style={{ fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: 34, fontWeight: 500, margin: "32px 0 8px", lineHeight: 1.2 }}>
        {report.title}
      </h1>
      {userName && <p style={{ fontSize: 14, color: "#5B6D7F", margin: 0 }}>Prepared for {userName}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, margin: "32px 0" }}>
        {[
          { label: "Average score", value: report.averageScore != null ? `${report.averageScore}` : "—", suffix: report.averageScore != null ? "/100" : "" },
          { label: "Scans analysed", value: report.scanCount ?? "—", suffix: "" },
          { label: "Trend", value: trendText, suffix: report.trendValue ? ` (${report.trend === "declining" ? "−" : "+"}${report.trendValue})` : "" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#FFFFFF", border: "1px solid rgba(44,62,80,0.08)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8E9BAA" }}>{stat.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, marginTop: 6 }}>
              {stat.value}
              <span style={{ fontSize: 13, fontWeight: 500, color: "#8E9BAA" }}>{stat.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.65, color: "#3D4F61", margin: "0 0 32px" }}>{report.summary}</p>

      {metrics.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8A9A5B", marginBottom: 14 }}>Your strongest areas</div>
          {metrics.map((m) => (
            <div key={m.name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                <span>{m.name}</span>
                <span>{m.score}/100</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(44,62,80,0.07)" }}>
                <div style={{ width: `${Math.max(0, Math.min(100, m.score))}%`, height: "100%", borderRadius: 999, background: "#8A9A5B" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {report.compliments.length > 0 && (
        <div style={{ background: "#E6E6FA", borderRadius: 20, padding: "22px 24px", marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5B6D7F", marginBottom: 10 }}>A note for you</div>
          {report.compliments.map((c, i) => (
            <p key={i} style={{ fontSize: 15, lineHeight: 1.6, margin: i ? "8px 0 0" : 0, fontStyle: "italic" }}>“{c}”</p>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid rgba(44,62,80,0.1)", paddingTop: 18, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8E9BAA" }}>
        <span>Generated by TintKin · tintkin.com</span>
        <span>For wellness tracking only, not medical advice.</span>
      </div>
    </div>
  );
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "report";
}

function loadImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportCard({ report, userName }) {
  const { showToast } = useToast();
  const sheetRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(null); // "pdf" | "share" | "image"
  const [shareOpen, setShareOpen] = useState(false);

  const fileBase = `tintkin-${slugify(report.title)}`;

  /** Mounts the sheet, rasterises it and returns { jpegDataUrl, pngDataUrl? }. */
  const renderSheet = async (format) => {
    flushSync(() => setExporting(true));
    try {
      await document.fonts?.ready;
      const node = sheetRef.current;
      if (!node) throw new Error("Report sheet not mounted");
      const htmlToImage = await import("html-to-image");
      const options = { pixelRatio: 2, backgroundColor: "#FDFBF7", cacheBust: true };
      return format === "png"
        ? await htmlToImage.toPng(node, options)
        : await htmlToImage.toJpeg(node, { ...options, quality: 0.92 });
    } finally {
      setExporting(false);
    }
  };

  const buildPdf = async () => {
    const jpeg = await renderSheet("jpeg");
    const { width, height } = await loadImageSize(jpeg);
    const bytes = jpegToPdf(dataUrlToBytes(jpeg), width, height);
    return new Blob([bytes], { type: "application/pdf" });
  };

  const run = async (kind, task) => {
    if (busy) return;
    setBusy(kind);
    try {
      await task();
    } catch (err) {
      if (err?.name !== "AbortError") {
        Sentry.captureException(err, { tags: { scope: "report-export" } });
        showToast({ type: "error", title: "Something went wrong", message: "We couldn't create the file. Please try again." });
      }
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPdf = () =>
    run("pdf", async () => {
      triggerDownload(await buildPdf(), `${fileBase}.pdf`);
      showToast({ type: "success", title: "PDF downloaded", message: "Your report has been saved." });
    });

  const handleShare = () =>
    run("share", async () => {
      const blob = await buildPdf();
      const file = new File([blob], `${fileBase}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: report.title, text: report.summary });
          return;
        } catch (err) {
          // Rendering can outlast the tap's user activation (Safari is strict);
          // fall through to the in-app share options instead of failing.
          if (err?.name !== "NotAllowedError") throw err;
        }
      }
      setShareOpen(true);
    });

  const handleSaveImage = () =>
    run("image", async () => {
      const png = await renderSheet("png");
      const blob = await (await fetch(png)).blob();
      triggerDownload(blob, `${fileBase}.png`);
      showToast({ type: "success", title: "Image saved", message: "Post it to Instagram or TikTok from your gallery." });
    });

  const shareText = `${report.title}\n${report.summary}\n\nTracked with TintKin · https://tintkin.com`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      showToast({ type: "success", title: "Copied", message: "Report summary copied to clipboard." });
    } catch {
      showToast({ type: "error", title: "Copy failed", message: "Your browser blocked clipboard access." });
    }
  };

  return (
    <article className="tk-card p-5 sm:p-6 flex flex-col gap-5 md:flex-row md:items-start">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${report.type === "weekly" ? "bg-sage/15 text-[#5E6B3A]" : "bg-lavender text-primary"}`}>
            {report.type} report
          </span>
          {report.aiGenerated && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFDAB9]/50 text-[#9A5B2E] inline-flex items-center gap-1">
              <Sparkles size={10} /> AI
            </span>
          )}
          <TrendPill trend={report.trend} value={report.trendValue} />
        </div>

        <h3 className="text-lg sm:text-xl font-display font-medium text-primary mb-1.5 leading-snug">{report.title}</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted mb-3">
          <Clock size={13} /> {formatDate(report.date)}
        </p>
        <p className="text-sm text-muted leading-relaxed mb-4">{report.summary}</p>

        {report.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {report.highlights.map((highlight, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full bg-sage/10 text-[#5E6B3A] font-medium">
                {highlight}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:w-40 shrink-0">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={Boolean(busy)}
          className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-xl bg-primary text-white text-sm md:text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {busy === "pdf" ? "Creating…" : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={Boolean(busy)}
          className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-xl bg-white border border-[rgba(44,62,80,0.12)] text-primary text-sm md:text-xs font-semibold hover:bg-black/[0.02] transition-colors disabled:opacity-60"
        >
          {busy === "share" ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
          Share
        </button>
      </div>

      {exporting && (
        <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
          <ReportSheet report={report} userName={userName} sheetRef={sheetRef} />
        </div>
      )}

      <AnimatedModal isOpen={shareOpen} onClose={() => setShareOpen(false)} size="sm" ariaLabel="Share report" panelClassName="p-6 pt-8 sm:pt-6">
        <h3 className="text-lg font-display font-semibold text-primary mb-1">Share your report</h3>
        <p className="text-sm text-muted mb-5">Pick how you&apos;d like to share it.</p>
        <div className="flex flex-col gap-2">
          {[
            { label: "Download PDF", hint: "Attach it anywhere", Icon: FileText, onClick: () => { setShareOpen(false); handleDownloadPdf(); } },
            { label: "Save as image", hint: "For Instagram & TikTok", Icon: ImageIcon, onClick: () => { setShareOpen(false); handleSaveImage(); } },
            { label: "WhatsApp", hint: "Send the summary", Icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
            { label: "Copy summary", hint: "Paste it into any app", Icon: Copy, onClick: () => { setShareOpen(false); handleCopy(); } },
          ].map(({ label, hint, Icon, onClick, href }) => {
            const inner = (
              <>
                <span className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center text-primary shrink-0"><Icon size={18} /></span>
                <span className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-primary">{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </>
            );
            const cls = "flex items-center gap-3 p-3 rounded-2xl border border-[rgba(44,62,80,0.08)] bg-white hover:bg-black/[0.02] transition-colors";
            return href ? (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => setShareOpen(false)}>{inner}</a>
            ) : (
              <button key={label} type="button" className={cls} onClick={onClick}>{inner}</button>
            );
          })}
        </div>
      </AnimatedModal>
    </article>
  );
}
