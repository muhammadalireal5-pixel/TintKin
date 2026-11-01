"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ClipboardList, Camera, Loader2, ShieldCheck, TriangleAlert, OctagonAlert, Info, Sun, Moon, FlaskConical, Target } from "lucide-react";
import SegmentedTabs from "@/app/components/ui/SegmentedTabs";
import { checkProductAction } from "@/app/lib/product-actions";
import { kinSay } from "@/app/components/companion/store";

const MAX_EDGE = 1400;

const VERDICT = {
  good: { label: "Fits your plan", tone: "bg-success-soft text-success", icon: ShieldCheck },
  neutral: { label: "No clash, no clear benefit", tone: "bg-blush text-muted", icon: Info },
  caution: { label: "Use with care", tone: "bg-warn-soft text-warn", icon: TriangleAlert },
  avoid: { label: "Not for you right now", tone: "bg-danger-soft text-danger", icon: OctagonAlert },
};

const KIN_LINES = {
  good: "That one fits your plan nicely.",
  neutral: "Nothing worrying in there.",
  caution: "A couple of things to watch with that one. I listed them.",
  avoid: "I'd leave that one on the shelf for now. Here's why.",
};

async function shrinkImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function quotaLine(quota) {
  if (!quota || quota.limit == null) return "Unlimited checks on your plan.";
  return `${quota.left} of ${quota.limit} free checks left this month.`;
}

function Report({ check }) {
  const r = check.report;
  const v = VERDICT[r.verdict] ?? VERDICT.neutral;
  const Icon = v.icon;
  const meaningful = r.classes.filter((c) => !c.trace);
  const trace = r.classes.filter((c) => c.trace);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${v.tone}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary truncate">{check.name || "Your product"}</p>
          <p className="text-sm text-muted">{v.label} · {check.ingredientCount} ingredients read</p>
        </div>
      </div>

      <div>
        <p className="tk-eyebrow mb-1.5 flex items-center gap-1.5"><FlaskConical size={13} aria-hidden="true" /> What it does</p>
        {meaningful.length ? (
          <div className="flex flex-wrap gap-1.5">
            {meaningful.map((c) => <span key={c.cls} className="tk-chip" title={c.names.join(", ")}>{c.label}</span>)}
          </div>
        ) : (
          <p className="text-sm text-muted">No key actives we track. Likely a base product such as a cleanser or a simple moisturiser.</p>
        )}
        {trace.length > 0 && <p className="mt-1.5 text-xs text-faint">Only a trace of {trace.map((c) => c.label.toLowerCase()).join(", ")} (listed after the preservatives).</p>}
      </div>

      {r.fit.length > 0 && (
        <div>
          <p className="tk-eyebrow mb-1.5 flex items-center gap-1.5"><Target size={13} aria-hidden="true" /> Fits your goals</p>
          <ul className="space-y-1">
            {r.fit.map((f) => (
              <li key={f.key} className="text-sm text-primary"><span className="font-medium">{f.label}</span> <span className="text-muted">through {f.by.join(" and ").toLowerCase()}</span></li>
            ))}
          </ul>
        </div>
      )}

      {(r.flags.length > 0 || r.conflicts.length > 0) && (
        <div>
          <p className="tk-eyebrow mb-1.5">Watch for</p>
          <ul className="space-y-1.5">
            {r.flags.map((f) => (
              <li key={f.msg} className={`text-sm leading-snug rounded-xl px-3 py-2 ${f.level === "avoid" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>{f.msg}</li>
            ))}
            {r.conflicts.map((c) => (
              <li key={c} className="text-sm leading-snug rounded-xl px-3 py-2 bg-warn-soft text-warn">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {r.verdict !== "avoid" && (
        <div className="flex items-start gap-2 text-sm text-primary">
          {r.slot === "am" ? <Sun size={16} className="mt-0.5 text-muted shrink-0" /> : <Moon size={16} className="mt-0.5 text-muted shrink-0" />}
          <p><span className="font-medium">Where it goes: </span>{r.placement}</p>
        </div>
      )}

      <p className="text-xs text-faint leading-relaxed">{r.disclaimer}</p>
    </div>
  );
}

export default function ProductsClient({ initialChecks = [], initialQuota = null }) {
  const [mode, setMode] = useState("paste");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [checks, setChecks] = useState(initialChecks);
  const [quota, setQuota] = useState(initialQuota);
  const [shownId, setShownId] = useState(initialChecks[0]?.id ?? null);
  const fileRef = useRef(null);

  const shown = checks.find((c) => c.id === shownId) ?? null;
  const outOfChecks = quota?.limit != null && quota.left <= 0;
  const ready = mode === "paste" ? text.trim().length > 10 : Boolean(photo);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      setPhoto(await shrinkImage(file));
    } catch {
      setError("That photo couldn't be opened. Try another one.");
    }
  };

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const res = await checkProductAction(mode === "paste" ? { text, name } : { image: photo, name }).catch(() => null);
    setBusy(false);
    if (!res?.success) {
      setError(res?.error ?? "Something went wrong. Please try again.");
      if (res?.quota) setQuota(res.quota);
      return;
    }
    setChecks((list) => [res.check, ...list].slice(0, 8));
    setShownId(res.check.id);
    setQuota(res.quota);
    setText("");
    setName("");
    setPhoto(null);
    kinSay(KIN_LINES[res.check.report.verdict] ?? KIN_LINES.neutral);
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 items-start">
      <section className="tk-card p-4 sm:p-5 flex flex-col gap-3" aria-label="Check a product">
        <SegmentedTabs
          label="How to add the product"
          value={mode}
          onChange={(m) => { setMode(m); setError(null); }}
          items={[
            { id: "paste", label: "Paste list", icon: <ClipboardList size={15} /> },
            { id: "photo", label: "Label photo", icon: <Camera size={15} /> },
          ]}
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Product name (optional)"
          className="tk-input w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base text-primary placeholder:text-faint"
        />
        <div className="h-40">
          {mode === "paste" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              placeholder="Aqua, Glycerin, Niacinamide, ..."
              aria-label="Ingredient list"
              className="w-full h-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base text-primary placeholder:text-faint"
            />
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-full rounded-2xl border border-dashed border-[var(--tk-border-strong)] bg-paper overflow-hidden flex flex-col items-center justify-center gap-2 text-muted hover:bg-blush"
              >
                {photo ? (
                  <span role="img" aria-label="Your product label" className="block w-full h-full bg-center bg-contain bg-no-repeat" style={{ backgroundImage: `url(${photo})` }} />
                ) : (
                  <>
                    <Camera size={24} aria-hidden="true" />
                    <span className="text-sm font-medium">Snap the ingredient list</span>
                    <span className="text-xs text-faint">Flat, in good light, the whole list in frame</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
        <button type="button" onClick={submit} disabled={!ready || busy || outOfChecks} className="tk-pill-btn tk-btn-primary w-full py-3 text-sm">
          {busy ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : "Check against my plan"}
        </button>
        <p className="min-h-5 text-xs text-muted" aria-live="polite">
          {error ? <span className="text-danger">{error}</span> : quotaLine(quota)}
          {outOfChecks && !error && <> <Link href="/pricing" className="font-semibold text-accent">Upgrade</Link></>}
        </p>
      </section>

      <section className="tk-card p-4 sm:p-5 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto" aria-label="Result">
        {shown ? (
          <Report check={shown} />
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-primary">Nothing checked yet</p>
            <p className="mt-1 text-sm text-muted">Check a product you own and we&apos;ll tell you how it fits your plan.</p>
          </div>
        )}
        {checks.length > 1 && (
          <div className="mt-5 pt-4 border-t border-line">
            <p className="tk-eyebrow mb-2">Recent checks</p>
            <div className="flex flex-wrap gap-1.5">
              {checks.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setShownId(c.id)}
                  aria-pressed={c.id === shownId}
                  className={`tk-chip max-w-[12rem] truncate ${c.id === shownId ? "ring-2 ring-accent/40" : ""}`}
                >
                  {c.name || new Date(c.createdAt).toLocaleDateString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
