"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { kinSay } from "./companion/store";

export const THEMES = [
  { id: "sage", label: "Sage & cream", swatch: ["#667640", "#E7EBD6"], themeColor: "#FDFBF7" },
  { id: "rose", label: "Rose clay", swatch: ["#B5546A", "#F8DCE1"], themeColor: "#FCF4F2" },
  { id: "terracotta", label: "Terracotta", swatch: ["#B7543A", "#F8DFD3"], themeColor: "#FBF3EE" },
];

const COOKIE = "tk-theme";
const EVENT = "tk-theme-change";

function subscribe(cb) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const getSnapshot = () => document.documentElement.dataset.theme || "sage";
const getServerSnapshot = () => "sage";

function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  document.cookie = `${COOKIE}=${theme.id}; path=/; max-age=31536000; samesite=lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.themeColor);
  window.dispatchEvent(new Event(EVENT));
  kinSay(
    { sage: "Sage and cream! Fresh, just like our logo.", rose: "Rose clay! So soft and pretty.", terracotta: "Terracotta! Warm and cozy. Love it." }[theme.id]
  );
}

/**
 * Switch between the colour themes. The choice is stored in a cookie so the
 * server can render the right theme on the first paint (see app/layout.js).
 * variant="compact": small swatch dots; "cards": labelled choice cards.
 */
export default function ThemeToggle({ variant = "cards", className = "" }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (variant === "compact") {
    return (
      <div role="radiogroup" aria-label="Colour theme" className={`inline-flex items-center gap-1.5 ${className}`}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={current === t.id}
            aria-label={t.label}
            title={t.label}
            onClick={() => applyTheme(t.id)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${current === t.id ? "border-primary scale-110" : "border-white"} shadow-sm`}
            style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Colour theme" className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {THEMES.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyTheme(t.id)}
            className={`relative flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${
              active ? "border-accent bg-accent-soft/60" : "border-line bg-surface hover:bg-blush/50"
            }`}
          >
            <span
              className="w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }}
            />
            <span className="text-sm font-semibold text-primary">{t.label}</span>
            {active && <Check size={16} className="absolute top-2.5 right-2.5 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
