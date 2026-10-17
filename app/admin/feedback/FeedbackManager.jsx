"use client";

import { useState, useTransition } from "react";
import { Star, ChevronDown, Trash2, Save, Search } from "lucide-react";
import { adminListFeedback, adminUpdateFeedback, adminDeleteFeedback } from "@/app/lib/feedback-actions";
import { useToast } from "@/app/components/ToastProvider";

const cardStyle = "bg-white/60 rounded-xl border border-[var(--tk-border-solid)]";
const inputStyle = "w-full px-3 py-2 rounded-lg border border-[var(--tk-border-solid)] bg-white/80 text-sm text-[var(--tk-text-primary)]";
const labelStyle = "text-xs font-medium text-[var(--tk-text-muted)] block mb-1";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
  { id: "wont_fix", label: "Won't fix" },
];
const STATUS_LABEL = { new: "New", in_progress: "In progress", resolved: "Resolved", wont_fix: "Won't fix" };
const STATUS_CHIP = {
  new: "bg-accent-soft text-accent-deep",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-success-soft text-success",
  wont_fix: "bg-black/5 text-muted",
};
const TYPE_LABEL = { review: "Review", feedback: "Feedback", complaint: "Complaint", idea: "Idea", bug: "Bug", other: "Other" };
const TYPE_CHIP = {
  complaint: "bg-danger-soft text-danger",
  bug: "bg-danger-soft text-danger",
  review: "bg-blush text-primary",
  idea: "bg-success-soft text-success",
  feedback: "bg-blush text-primary",
  other: "bg-black/5 text-muted",
};
const PRIORITY_CHIP = { high: "bg-danger-soft text-danger", medium: "bg-amber-100 text-amber-800", low: "bg-black/5 text-muted" };

const fmt = (iso) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Stars({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} className={n <= value ? "fill-accent text-accent" : "text-faint"} />
      ))}
    </span>
  );
}

function Meta({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-[var(--tk-text-muted)]">{label}</p>
      <p className="text-sm text-[var(--tk-text-primary)] break-words">{value || "—"}</p>
    </div>
  );
}

function FeedbackRow({ item, onChanged, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority || "");
  const [note, setNote] = useState(item.adminNote);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const dirty = status !== item.status || (priority || null) !== item.priority || note !== item.adminNote;

  const save = async () => {
    setSaving(true);
    const res = await adminUpdateFeedback(item.id, { status, priority: priority || null, adminNote: note });
    setSaving(false);
    if (res.success) {
      onChanged(res.item);
      showToast({ type: "success", title: "Saved", message: "Your notes are private to the admin portal." });
    } else {
      showToast({ type: "error", title: "Couldn't save", message: res.error });
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this feedback permanently?")) return;
    const res = await adminDeleteFeedback(item.id);
    if (res.success) onDeleted(item.id);
    else showToast({ type: "error", title: "Couldn't delete", message: res.error });
  };

  return (
    <li className={cardStyle}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_CHIP[item.type]}`}>{TYPE_LABEL[item.type]}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CHIP[item.status]}`}>{STATUS_LABEL[item.status]}</span>
            {item.priority && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_CHIP[item.priority]}`}>{item.priority} priority</span>
            )}
            <Stars value={item.rating} />
          </div>
          <p className={`text-sm text-[var(--tk-text-primary)] ${open ? "whitespace-pre-wrap break-words" : "line-clamp-2"}`}>{item.message}</p>
          <p className="mt-1.5 text-xs text-[var(--tk-text-muted)]">
            {item.userName || "Unnamed"} · {item.userEmail} · {fmt(item.createdAt)}
          </p>
        </div>
        <ChevronDown size={18} className={`shrink-0 mt-1 text-[var(--tk-text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[var(--tk-border-solid)] pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Meta label="User" value={item.userName} />
            <Meta label="Email" value={item.userEmail} />
            <Meta label="Plan" value={item.tier} />
            <Meta label="Scans so far" value={String(item.scanCount)} />
            <Meta label="Page" value={item.page} />
            <Meta label="Device" value={item.device} />
            <Meta label="Screen" value={item.viewport} />
            <Meta label="Theme" value={item.theme} />
          </div>

          <div className="rounded-xl bg-[var(--tk-accent-soft)]/40 border border-[var(--tk-border-solid)] p-3 space-y-3">
            <p className="text-xs font-semibold text-[var(--tk-text-muted)]">Private triage. Never shown to the user.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelStyle} htmlFor={`st-${item.id}`}>Status</label>
                <select id={`st-${item.id}`} className={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelStyle} htmlFor={`pr-${item.id}`}>Priority (optional)</label>
                <select id={`pr-${item.id}`} className={inputStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelStyle} htmlFor={`nt-${item.id}`}>What I&apos;ll do to fix or improve this (optional)</label>
              <textarea
                id={`nt-${item.id}`}
                className={`${inputStyle} resize-y`}
                rows={3}
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Add a streak freeze, rework the scan tips copy…"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={remove} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg text-danger hover:bg-danger-soft">
                <Trash2 size={14} /> Delete
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white disabled:opacity-50"
              >
                <Save size={14} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export default function FeedbackManager({ initial, loadError }) {
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(loadError);
  const [pending, startTransition] = useTransition();

  const load = (next = {}) => {
    const q = { status, type, search, page: 1, ...next };
    startTransition(async () => {
      const res = await adminListFeedback(q);
      if (res.success) {
        setData(res);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  };

  const changeFilter = (patch) => {
    if ("status" in patch) setStatus(patch.status);
    if ("type" in patch) setType(patch.type);
    load(patch);
  };

  if (!data) {
    return <p className="text-sm text-danger">{error || "Couldn't load feedback."}</p>;
  }

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const totalAll = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["new", "in_progress", "resolved", "wont_fix"].map((s) => (
          <div key={s} className={`${cardStyle} p-3`}>
            <p className="text-xs text-[var(--tk-text-muted)]">{STATUS_LABEL[s]}</p>
            <p className="text-2xl font-semibold text-[var(--tk-text-primary)] tabular-nums">{data.counts[s]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => changeFilter({ status: t.id, page: 1 })}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${status === t.id ? "bg-accent text-white border-accent" : "bg-white/60 border-[var(--tk-border-solid)] text-[var(--tk-text-primary)]"}`}
          >
            {t.label}{t.id === "all" ? ` (${totalAll})` : ` (${data.counts[t.id]})`}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select className={`${inputStyle} sm:w-48`} aria-label="Type" value={type} onChange={(e) => changeFilter({ type: e.target.value, page: 1 })}>
          <option value="all">All types</option>
          {Object.entries(TYPE_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); load({ page: 1 }); }}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tk-text-muted)]" />
          <input
            className={`${inputStyle} pl-9`}
            placeholder="Search message, user, email, notes or page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <ul className={`space-y-3 ${pending ? "opacity-60" : ""}`}>
        {data.items.length === 0 ? (
          <li className={`${cardStyle} p-8 text-center text-sm text-[var(--tk-text-muted)]`}>Nothing here yet.</li>
        ) : (
          data.items.map((item) => (
            <FeedbackRow
              key={item.id}
              item={item}
              onChanged={(updated) => setData((d) => ({ ...d, items: d.items.map((i) => (i.id === updated.id ? updated : i)) }))}
              onDeleted={(id) => load({ page: data.page })}
            />
          ))
        )}
      </ul>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button type="button" disabled={data.page <= 1 || pending} onClick={() => load({ page: data.page - 1 })} className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--tk-border-solid)] disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-[var(--tk-text-muted)] tabular-nums">{data.page} / {pages}</span>
          <button type="button" disabled={data.page >= pages || pending} onClick={() => load({ page: data.page + 1 })} className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--tk-border-solid)] disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
