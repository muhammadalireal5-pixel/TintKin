"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { PLAN_MONTH_PRESETS, MAX_PLAN_MONTHS } from "@/lib/constants/plan";

const HINTS = {
  1: "One 30-day plan",
  3: "Recommended: room to adjust",
  5: "Steady, deeper progress",
  7: "A long, thorough journey",
};

const tile = (on) =>
  `relative text-left rounded-2xl border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    on ? "bg-accent-soft border-accent ring-1 ring-accent text-accent-deep" : "bg-white border-line text-primary hover:border-accent/50"
  }`;

/**
 * How long to work on your skin: 1, 3, 5 or 7 months, or any number from 1 to
 * 12 ("Custom"). Controlled: `value` is a whole number of months (0 = none yet).
 * `min` stops it going below the month someone is already in.
 */
export default function DurationPicker({ value, onChange, min = 1, compact = false }) {
  const isPreset = PLAN_MONTH_PRESETS.includes(value);
  const [customOpen, setCustomOpen] = useState(value > 0 && !isPreset);
  const custom = customOpen || (value > 0 && !isPreset);
  const presets = PLAN_MONTH_PRESETS.filter((m) => m >= min);

  const step = (d) => onChange(Math.min(MAX_PLAN_MONTHS, Math.max(min, (value || min) + d)));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {presets.map((m) => {
          const on = value === m && !custom;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setCustomOpen(false);
                onChange(m);
              }}
              className={`${tile(on)} ${compact ? "min-h-[3.4rem]" : "min-h-[4rem]"}`}
            >
              <span className="block text-sm font-semibold">{m} {m === 1 ? "month" : "months"}</span>
              <span className="block text-xs font-normal text-muted mt-px leading-tight">{HINTS[m]}</span>
              {on && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center" aria-hidden="true">
                  <Check size={10} strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={`${tile(custom)} flex items-center justify-between gap-3`}>
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => {
            setCustomOpen(true);
            if (isPreset || !value) onChange(Math.max(min, isPreset ? value : 2));
          }}
          className="flex-1 text-left focus-visible:outline-none"
        >
          <span className="block text-sm font-semibold">Custom</span>
          <span className="block text-xs font-normal text-muted mt-px">Choose 1 to {MAX_PLAN_MONTHS} months</span>
        </button>
        {custom && (
          <span className="inline-flex items-center gap-1" role="group" aria-label="Number of months">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={value <= min}
              aria-label="One month less"
              className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-primary disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
            <span className="w-14 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value} {value === 1 ? "month" : "months"}</span>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={value >= MAX_PLAN_MONTHS}
              aria-label="One month more"
              className="w-8 h-8 rounded-full bg-white border border-line flex items-center justify-center text-primary disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
