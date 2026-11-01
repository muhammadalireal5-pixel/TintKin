"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { saveMirrorCheck } from "@/app/lib/actions";
import { kinSay, refreshCompanion } from "@/app/components/companion/store";

const FACES = [
  { value: 1, emoji: "😣", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
];

const THANKS = {
  1: "Thanks for telling me. Gentle care today, and we watch it together.",
  2: "Noted. Small dips are normal, keep going.",
  3: "Steady is good. Consistency is what moves the needle.",
  4: "Love that. Keep doing what you're doing.",
  5: "Glowing! If this keeps up, you'll earn a scan to measure it.",
};

export default function MirrorCheck({ initial = null }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  const pick = async (v) => {
    if (saving) return;
    const prev = value;
    setValue(v);
    setSaving(true);
    const res = await saveMirrorCheck(v, Intl.DateTimeFormat().resolvedOptions().timeZone).catch(() => null);
    setSaving(false);
    if (!res?.success) {
      setValue(prev);
      return;
    }
    kinSay(THANKS[v]);
    refreshCompanion();
  };

  return (
    <section className="tk-card p-4" aria-label="Mirror check">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-primary">How does your skin look today?</p>
        <p className="text-xs text-muted shrink-0">{value ? "Saved" : "One tap"}</p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Rate your skin today">
        {FACES.map((f) => {
          const on = value === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={f.label}
              onClick={() => pick(f.value)}
              className={`relative h-16 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${on ? "border-accent bg-accent-soft ring-2 ring-accent/40" : "border-line bg-paper hover:bg-blush"}`}
            >
              <span className="text-xl leading-none" aria-hidden="true">{f.emoji}</span>
              <span className={`text-[11px] font-medium ${on ? "text-accent-deep" : "text-muted"}`}>{f.label}</span>
              {on && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                  <Check size={11} strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
