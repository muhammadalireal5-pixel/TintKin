"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Volume2, VolumeX, Play, Pause, RotateCcw, Check, SkipForward, Smile, Sparkles, Flame, CircleAlert } from "lucide-react";
import { saveRoutineSkip } from "@/app/lib/actions";
import { logReaction } from "@/app/lib/plan-actions";
import { stepTemplate } from "@/lib/plan/knowledge";
import { kinSay, refreshCompanion } from "@/app/components/companion/store";

const VOICE_KEY = "tk:session-voice";

const REACTIONS = [
  { id: "fine", label: "Fine", hint: "Calm and comfortable", icon: Smile },
  { id: "tingle", label: "Tingled", hint: "A little warm, gone soon", icon: Sparkles },
  { id: "irritated", label: "Irritated", hint: "Stinging, red or tight", icon: Flame },
  { id: "breakout", label: "Breakout", hint: "New spots since yesterday", icon: CircleAlert },
];

const KIND_LABEL = { cleanse: "Cleanse", treat: "Treat", moisturise: "Moisturise", protect: "Protect", habit: "Wind down" };

function readVoicePref() {
  try {
    return window.localStorage.getItem(VOICE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeVoicePref(on) {
  try {
    window.localStorage.setItem(VOICE_KEY, on ? "on" : "off");
  } catch {}
}

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.98;
  window.speechSynthesis.speak(u);
}

function reactionMessage(level, res) {
  if (res?.swapped?.length) return "Your skin reacted to the same active twice, so we swapped it for a gentler step. Actives rest for three days.";
  if (level === "irritated" || level === "breakout") return "Got it. Your actives rest for the next three days, then restart one step lower. Barrier care only until then.";
  if (level === "tingle") return "Noted. A tingle is common, so we hold your actives where they are for now.";
  return "Lovely. Calm skin is how we earn the next step up.";
}

export default function SessionPlayer({ slot, steps, checks, onDone, onClose }) {
  const router = useRouter();
  const items = useMemo(() => steps.map((s) => ({ ...s, template: stepTemplate(s) })), [steps]);
  const firstOpen = Math.max(0, items.findIndex((s) => !checks.includes(s.id)));
  const [index, setIndex] = useState(firstOpen);
  const [voice, setVoice] = useState(readVoicePref);
  const [remaining, setRemaining] = useState(items[firstOpen]?.template.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const left = useRef(items[firstOpen]?.template.seconds ?? 0);
  const voiceOn = useRef(voice);
  useEffect(() => {
    voiceOn.current = voice;
  }, [voice]);

  const setLeft = useCallback((v) => {
    left.current = v;
    setRemaining(v);
  }, []);

  const finished = index >= items.length;
  const step = finished ? null : items[index];

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const next = Math.max(0, left.current - 1);
      setLeft(next);
      if (next === 0) {
        setRunning(false);
        if (voiceOn.current) speak("Time. Tap done when you're ready.");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, setLeft]);

  useEffect(() => {
    if (!voice) return;
    if (step) speak(`${step.text}. ${step.template.tip}`);
    else if (!result) speak("Session done. How did your skin feel?");
  }, [index, voice, step, result]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const goTo = useCallback((next) => {
    setRunning(false);
    setIndex(next);
    setLeft(items[next]?.template.seconds ?? 0);
  }, [items, setLeft]);

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

  const done = async () => {
    if (!checks.includes(step.id)) await onDone(step.id);
    goTo(index + 1);
  };

  const skip = async () => {
    saveRoutineSkip(slot, step.id, tz()).catch(() => {});
    goTo(index + 1);
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    writeVoicePref(next);
    if (!next) window.speechSynthesis?.cancel();
  };

  const saveReaction = async () => {
    if (!reaction || saving) return;
    setSaving(true);
    const res = await logReaction(reaction, slot, tz()).catch(() => null);
    setSaving(false);
    const message = res?.success ? reactionMessage(reaction, res) : "We couldn't save that just now. Your routine is still ticked.";
    setResult(message);
    if (voice) speak(message);
    kinSay(message);
    refreshCompanion();
    router.refresh();
  };

  const total = items.length;
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-base" role="dialog" aria-modal="true" aria-label={`${slot === "am" ? "Morning" : "Evening"} session`} style={{ height: "100dvh" }}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button type="button" onClick={onClose} className="w-11 h-11 -ml-2 flex items-center justify-center text-muted hover:text-primary" aria-label="Close session">
          <X size={22} />
        </button>
        <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, 1fr)` }} aria-hidden="true">
          {items.map((s, i) => (
            <span key={s.id} className={`h-1.5 rounded-full ${i < index || checks.includes(s.id) ? "bg-accent" : i === index ? "bg-accent/45" : "bg-blush"}`} />
          ))}
        </div>
        <button type="button" onClick={toggleVoice} className="w-11 h-11 -mr-2 flex items-center justify-center text-muted hover:text-primary" aria-pressed={voice} aria-label={voice ? "Mute voice guidance" : "Turn on voice guidance"}>
          {voice ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>

      <main className="flex-1 min-h-0 px-4 pb-3 flex flex-col">
        {step ? (
          <div className="tk-card flex-1 min-h-0 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <p className="tk-eyebrow">Step {index + 1} of {total} · {KIND_LABEL[step.template.kind]}</p>
              {step.schedule && <span className="tk-chip shrink-0">{step.schedule}</span>}
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-primary leading-snug">{step.text}</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">{step.template.tip}</p>
            {step.why && (
              <p className="mt-3 text-sm text-muted leading-relaxed overflow-y-auto min-h-0">
                <span className="font-medium text-primary/80">Why this is for you: </span>{step.why}
              </p>
            )}
            <div className="mt-auto pt-5 flex flex-col items-center gap-3">
              <p className="text-5xl font-semibold tabular-nums text-primary" aria-live="polite">{minutes}:{seconds}</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setRunning((r) => !r)} className="tk-pill-btn tk-btn-ghost px-4 py-2 text-sm" disabled={remaining === 0}>
                  {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start timer</>}
                </button>
                <button type="button" onClick={() => { setRunning(false); setLeft(step.template.seconds); }} className="w-10 h-10 flex items-center justify-center text-muted hover:text-primary" aria-label="Reset timer">
                  <RotateCcw size={17} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="tk-card flex-1 min-h-0 p-5 flex flex-col">
            <p className="tk-eyebrow">Session done</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-primary leading-snug">How did your skin feel?</h2>
            <p className="mt-1 text-sm text-muted">Your answer shapes tomorrow&apos;s routine.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="How your skin felt">
              {REACTIONS.map(({ id, label, hint, icon: Icon }) => {
                const on = reaction === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={Boolean(result)}
                    onClick={() => setReaction(id)}
                    className={`relative h-24 rounded-2xl border p-3 text-left transition-colors ${on ? "border-accent bg-accent-soft ring-2 ring-accent/40" : "border-line bg-paper hover:bg-blush"}`}
                  >
                    <Icon size={18} className={on ? "text-accent-deep" : "text-muted"} aria-hidden="true" />
                    <span className="mt-1.5 block text-sm font-semibold text-primary">{label}</span>
                    <span className="block text-xs text-muted leading-snug">{hint}</span>
                    {on && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 min-h-[3.75rem] text-sm text-primary leading-relaxed" aria-live="polite">{result ?? ""}</p>
          </div>
        )}
      </main>

      <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 flex gap-2.5">
        {step ? (
          <>
            <button type="button" onClick={skip} className="tk-pill-btn tk-btn-ghost flex-1 py-3 text-sm">
              <SkipForward size={16} /> Skip
            </button>
            <button type="button" onClick={done} className="tk-pill-btn tk-btn-primary flex-[2] py-3 text-sm">
              <Check size={16} /> Done
            </button>
          </>
        ) : result ? (
          <button type="button" onClick={onClose} className="tk-pill-btn tk-btn-primary flex-1 py-3 text-sm">Back to my plan</button>
        ) : (
          <button type="button" onClick={saveReaction} disabled={!reaction || saving} className="tk-pill-btn tk-btn-primary flex-1 py-3 text-sm">
            {saving ? "Saving…" : "Save and finish"}
          </button>
        )}
      </footer>
    </div>
  );
}
