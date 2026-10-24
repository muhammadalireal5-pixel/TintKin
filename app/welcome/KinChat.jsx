"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Plus, Minus } from "lucide-react";
import KinAvatar from "@/app/components/companion/KinAvatar";
import Typewriter from "@/app/components/companion/Typewriter";
import { chatWithKin } from "@/app/lib/plan-actions";

/**
 * Kin asks whether the plan feels right and changes it from plain-language
 * requests. The server does the editing (bounded and safety-filtered); this is
 * only the conversation. `onPlan` receives the updated plan so the cards above
 * refresh, and `onApprove` fires when they say it looks good.
 */
export default function KinChat({ plan, onPlan, onApprove, intro, suggestions }) {
  const [messages, setMessages] = useState([{ from: "kin", text: intro, typed: true }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);

  const send = async (raw) => {
    const message = raw.trim();
    if (!message || busy) return;
    setText("");
    setMessages((m) => [...m, { from: "me", text: message }]);
    setBusy(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await chatWithKin(message, tz);
    setBusy(false);
    setNudge((n) => n + 1);
    if (res?.plan) onPlan(res.plan, Boolean(res.dropped?.length || res.added?.length));
    setMessages((m) => [
      ...m,
      {
        from: "kin",
        text: res?.reply || res?.error || "Hmm, I couldn't do that just now.",
        typed: true,
        dropped: res?.dropped || [],
        added: res?.added || [],
      },
    ]);
  };

  const approve = () => {
    setMessages((m) => [...m, { from: "me", text: "Looks great" }, { from: "kin", text: "Love it. Tap start whenever you're ready, and I'll be here every day.", typed: true }]);
    setNudge((n) => n + 1);
    onApprove?.();
  };

  const lastKin = messages.map((m) => m.from).lastIndexOf("kin");

  return (
    <section className="tk-card p-4 sm:p-5 bg-gradient-to-br from-surface to-accent-soft/40" aria-label="Chat with Kin">
      <div className="flex items-start gap-3">
        <KinAvatar size={52} nudge={nudge} />
        <div className="flex-1 min-w-0 space-y-2.5">
          {messages.map((m, i) =>
            m.from === "kin" ? (
              <div key={i} className="rounded-2xl rounded-tl-md bg-white border border-line px-3.5 py-2.5 text-sm text-primary leading-relaxed shadow-sm">
                {i === lastKin && m.typed ? <Typewriter key={m.text} text={m.text} /> : m.text}
                {(m.added?.length > 0 || m.dropped?.length > 0) && (
                  <ul className="mt-2 space-y-1">
                    {m.added.map((t) => (
                      <li key={`a-${t}`} className="flex items-start gap-1.5 text-xs text-success"><Plus size={13} className="mt-0.5 shrink-0" /> {t}</li>
                    ))}
                    {m.dropped.map((t) => (
                      <li key={`d-${t}`} className="flex items-start gap-1.5 text-xs text-muted line-through"><Minus size={13} className="mt-0.5 shrink-0" /> {t}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div key={i} className="ml-auto max-w-[85%] w-fit rounded-2xl rounded-tr-md bg-accent text-white px-3.5 py-2 text-sm">{m.text}</div>
            )
          )}
          {busy && (
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-white border border-line px-3.5 py-2.5 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" /> Kin is thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={approve} disabled={busy} className="tk-pill-btn tk-btn-soft px-3.5 py-2 text-xs disabled:opacity-50">
          Looks great
        </button>
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="rounded-full border border-line bg-white px-3.5 py-2 text-xs font-medium text-primary hover:border-accent/50 transition-colors disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Tell Kin what to change…"
          aria-label="Tell Kin what to change"
          className="tk-input flex-1"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="tk-pill-btn tk-btn-primary w-11 h-11 !p-0 disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
      <p className="text-[11px] text-muted mt-2">Kin adjusts within safety rules for your skin profile. {plan.generatedBy === "rules" ? "Plans are general guidance, not medical advice." : ""}</p>
    </section>
  );
}
