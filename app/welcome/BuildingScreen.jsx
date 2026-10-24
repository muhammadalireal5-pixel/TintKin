"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, RotateCw } from "lucide-react";
import KinAvatar from "@/app/components/companion/KinAvatar";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

/**
 * What the plan engine does with this person's answers, line by line. Every
 * line is true for this profile (it mirrors lib/plan/engine.js), so the
 * "analysis" explains the plan instead of faking progress.
 */
export function buildingLines(profile) {
  const concerns = profile.concerns.map((c) => c.label.toLowerCase());
  const lines = [
    "Reading your answers…",
    `Skin type: ${profile.skinType}, ${profile.sensitivity} sensitivity`,
    `Sun response: Fitzpatrick type ${ROMAN[profile.phototype] || "III"}${profile.highSun ? ", so sun protection comes first" : ""}`,
    `Priorities: ${concerns.join(" → ")}`,
    profile.pregnant
      ? "Safety check: pregnancy-safe ingredients only"
      : profile.avoidUnsafe
        ? "Safety check: you skipped one question, so gentle and pregnancy-safe only"
        : profile.sensitivity === "high"
          ? "Safety check: no strong actives for reactive skin"
          : "Safety check: one new active at a time, never two strong ones together",
  ];
  if (profile.usesRetinoid) lines.push("You already use a retinoid, so we won't add another");
  if (profile.sleepShort) lines.push("Short sleep noted, adding a wind-down habit");
  lines.push("Week 1 is barrier first: no actives, just a steady base");
  lines.push("Building your 30-day plan");
  return lines;
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The live "analysis": lines type out one by one, each ticking when done. The
 * last line waits (with a spinner) for the real plan to come back, then the
 * screen hands over to the reveal.
 */
export default function BuildingScreen({ profile, ready, error, onRetry, onDone }) {
  const lines = buildingLines(profile);
  const [state, setState] = useState(() => (reducedMotion() ? { i: lines.length - 1, n: lines[lines.length - 1].length } : { i: 0, n: 0 }));
  const { i, n } = state;
  const last = i === lines.length - 1;
  const typedAll = last && n >= lines[i].length;

  useEffect(() => {
    if (typedAll) return undefined;
    const line = lines[i];
    const t = window.setTimeout(
      () => setState(n < line.length ? { i, n: n + 1 } : { i: i + 1, n: 0 }),
      n < line.length ? 16 : 420
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n, typedAll]);

  useEffect(() => {
    if (!typedAll || !ready) return undefined;
    const t = window.setTimeout(onDone, 800);
    return () => window.clearTimeout(t);
  }, [typedAll, ready, onDone]);

  return (
    <section className="tk-card overflow-hidden tk-anim-1" role="status" aria-live="polite" aria-label="Building your plan">
      <div className="flex items-center gap-4 bg-gradient-to-br from-accent-soft via-blush to-lavender/60 px-6 py-5">
        <KinAvatar size={64} />
        <div className="min-w-0">
          <p className="tk-eyebrow">Kin is on it</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-primary leading-tight">Building your plan</h1>
        </div>
      </div>

      <ol className="px-6 py-5 space-y-3 font-mono text-[13px] sm:text-sm">
        {lines.slice(0, i + 1).map((text, idx) => {
          const current = idx === i;
          const finished = !current || (last && typedAll && ready);
          return (
            <li key={text} className={`flex items-start gap-3 ${current ? "text-primary" : "text-primary/70"}`}>
              <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${finished ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                {finished ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="animate-spin" />}
              </span>
              <span>
                {current ? text.slice(0, n) : text}
                {current && !finished && <span className="tk-caret" aria-hidden="true" />}
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-danger" role="alert">{error}</p>
          <button type="button" onClick={onRetry} className="tk-pill-btn tk-btn-primary mt-3 px-6">
            <RotateCw size={15} /> Try again
          </button>
        </div>
      )}
    </section>
  );
}
