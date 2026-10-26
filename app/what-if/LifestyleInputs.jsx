"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getWhatIfInputs } from "@/app/lib/actions";
import { SOURCE_LABELS } from "@/lib/whatif/labels";

const SOURCE_STYLE = {
  profile: "bg-accent-soft text-accent-deep",
  ticks: "bg-success-soft text-success",
  checkins: "bg-success-soft text-success",
  override: "bg-primary/10 text-primary",
  default: "bg-line text-muted",
};

export default function LifestyleInputs({ overrides, onChange }) {
  const [state, setState] = useState({ loading: true, data: null, failed: false });
  const requestId = useRef(0);
  const key = JSON.stringify(overrides);

  useEffect(() => {
    const id = ++requestId.current;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    getWhatIfInputs(tz, JSON.parse(key))
      .then((res) => {
        if (id !== requestId.current) return;
        setState(res?.success ? { loading: false, data: res, failed: false } : { loading: false, data: null, failed: true });
      })
      .catch(() => {
        if (id === requestId.current) setState({ loading: false, data: null, failed: true });
      });
  }, [key]);

  if (state.failed) return null;

  const rows = state.data?.inputs;
  const hasOverrides = Object.keys(overrides).length > 0;
  const assumed = rows?.filter((r) => r.source === "default") ?? [];

  return (
    <section className="tk-card p-5 sm:p-6 rounded-3xl mb-6" aria-label="Your lifestyle assumptions">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-base font-semibold text-primary">Your lifestyle</h3>
        {hasOverrides && (
          <button type="button" onClick={() => onChange({})} className="text-xs font-semibold text-accent-deep hover:text-accent">
            Reset to my data
          </button>
        )}
      </div>
      <p className="text-xs text-muted mb-4">The projection starts from your real habits. Change any of them to try a scenario.</p>

      {!rows ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 rounded-xl bg-blush animate-pulse" />)}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.key} className="py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <div className="min-w-0">
                <p className="text-sm text-primary">{r.label}</p>
                <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 tk-text-micro font-semibold ${SOURCE_STYLE[r.source]}`}>{SOURCE_LABELS[r.source]}</span>
                {r.detail && <p className="tk-text-micro text-muted mt-0.5">{r.detail}</p>}
              </div>
              <select
                aria-label={r.label}
                value={String(r.value)}
                onChange={(e) => {
                  const opt = r.options.find((o) => String(o.value) === e.target.value);
                  onChange({ ...overrides, [r.key]: opt.value });
                }}
                className="tk-input !w-auto py-2 text-sm"
              >
                {r.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}

      {assumed.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {assumed.map((a) => a.label.toLowerCase()).join(", ")} {assumed.length === 1 ? "is" : "are"} assumed because we don&apos;t have your data yet. {" "}
          <Link href="/profile/skin" className="font-semibold text-accent-deep underline">Update your skin profile</Link> for a closer projection.
        </p>
      )}
    </section>
  );
}
