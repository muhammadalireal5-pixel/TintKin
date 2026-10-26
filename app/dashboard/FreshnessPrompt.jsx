"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, HeartPulse } from "lucide-react";
import { submitFreshnessCheckIn } from "@/app/lib/actions";
import { SLEEP_OPTIONS, OUTDOOR_OPTIONS, STRESS_OPTIONS } from "@/lib/constants/profile";

const SNOOZE_KEY = "tk:freshness-snooze";
const SNOOZE_DAYS = 3;

const QUESTIONS = {
  sleep: { label: "Sleep lately", options: SLEEP_OPTIONS },
  stress: { label: "Stress lately", options: STRESS_OPTIONS },
  outdoor: { label: "Time outside", options: OUTDOOR_OPTIONS },
  smoker: { label: "Do you smoke?", options: [{ value: false, label: "No" }, { value: true, label: "Yes" }] },
};

const TITLES = {
  weekly: { title: "Quick check-in", sub: "Ten seconds. Still right, or has anything changed?" },
  quarterly: { title: "Time to refresh your answers", sub: "A few months have passed. Confirm or change them so your plan stays accurate." },
};

const noopSubscribe = () => () => {};

function snoozed() {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
  } catch {
    return;
  }
}

export default function FreshnessPrompt({ kind, fields, initial = {} }) {
  const router = useRouter();
  const [answers, setAnswers] = useState(() => Object.fromEntries(fields.map((f) => [f, initial[f] ?? null])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gone, setGone] = useState(false);
  const snoozedStored = useSyncExternalStore(noopSubscribe, snoozed, () => false);
  const [dismissed, setDismissed] = useState(false);

  if (gone || dismissed || snoozedStored) return null;

  const ready = fields.every((f) => answers[f] !== null && answers[f] !== undefined);

  const save = async () => {
    setBusy(true);
    setError("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await submitFreshnessCheckIn(kind, answers, tz);
    setBusy(false);
    if (res?.success) {
      setGone(true);
      router.refresh();
    } else {
      setError(res?.error || "We couldn't save that. Please try again.");
    }
  };

  return (
    <section className="tk-card p-4 !bg-accent-soft" aria-label={TITLES[kind].title}>
      <div className="flex items-start gap-3">
        <span className="tk-icon-circle w-10 h-10 bg-paper shrink-0"><HeartPulse size={18} /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{TITLES[kind].title}</p>
          <p className="text-xs text-muted">{TITLES[kind].sub}</p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field}>
            <p className="text-xs font-medium text-primary mb-1.5">{QUESTIONS[field].label}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={QUESTIONS[field].label}>
              {QUESTIONS[field].options.map((o) => {
                const on = answers[field] === o.value;
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAnswers((a) => ({ ...a, [field]: o.value }))}
                    className={`min-h-9 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-accent bg-accent text-white font-medium" : "border-line bg-paper text-muted hover:border-accent/40"}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={!ready || busy} className="tk-pill-btn tk-btn-primary px-5 py-2 text-sm disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save
        </button>
        <button
          type="button"
          onClick={() => {
            snooze();
            setDismissed(true);
          }}
          className="text-xs font-medium text-muted hover:text-primary"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
