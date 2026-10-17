"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getWeeklyHistory } from "@/app/lib/actions";
import Link from "next/link";
import { ChevronLeft, Calendar, RefreshCw } from "lucide-react";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import PageHeader from "@/app/components/ui/PageHeader";
import { STATUS } from "@/lib/constants/status";

function applyResult(res, { setHistory, setError, router }) {
  if (res?.redirectTo) {
    router.push(res.redirectTo);
  } else if (res?.status === STATUS.OK && Array.isArray(res.history)) {
    setHistory(res.history);
  } else if (Array.isArray(res)) {
    setHistory(res);
  } else {
    setError(res?.message || "Failed to load score history.");
  }
}

export default function HistoryClient({ historyPromise }) {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Consumes the fetch the server component already kicked off at request
  // time, instead of only starting it after hydration. A signed-in-but-not-
  // onboarded user (reachable since /history is session-gated but not
  // onboarding-gated by proxy.js) gets redirected client-side via
  // `redirectTo` rather than getDbUser()'s own redirect(), which has no
  // effect on an unawaited, streamed promise — see getDbUserOrStatus().
  useEffect(() => {
    let cancelled = false;
    // `historyPromise` crosses the server->client boundary as a prop, so on
    // the client it's React's internal "chunk" thenable (the same object
    // `use()` reads), not a native Promise — its `.then()` exists but never
    // returns anything, so chaining `.catch()`/`.finally()` straight off it
    // throws "Cannot read properties of undefined (reading 'catch')" (same
    // bug fixed in LeaderboardClient.jsx). Promise.resolve adopts its
    // resolution via one `.then(resolve, reject)` call and hands back a
    // real, chainable Promise.
    Promise.resolve(historyPromise)
      .then((res) => { if (!cancelled) applyResult(res, { setHistory, setError, router }); })
      .catch((err) => {
        if (cancelled) return;
        Sentry.captureException(err, { tags: { scope: "history-promise-unexpected-rejection" } });
        setError("Failed to load score history.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [historyPromise, router]);

  const fetchHistory = () => {
    setLoading(true);
    setError(null);
    getWeeklyHistory()
      .then((res) => applyResult(res, { setHistory, setError, router }))
      .catch((err) => {
        Sentry.captureException(err, { tags: { scope: "history-fetch-unexpected-rejection" } });
        setError("Failed to load score history.");
      })
      .finally(() => setLoading(false));
  };

  const METRICS = [
    ["wrinkles", "Wrinkles"],
    ["firmness", "Firmness"],
    ["spots", "Spots"],
    ["radiance", "Radiance"],
  ];

  return (
    <div className="w-full pb-6">
      <div className="flex items-start gap-3 tk-anim-1">
        <Link
          href="/progress"
          aria-label="Back to progress"
          className="mt-1 sm:mt-2 w-10 h-10 shrink-0 rounded-full bg-surface border border-line flex items-center justify-center text-primary hover:bg-blush transition-colors focus-visible:ring-2 ring-accent"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <PageHeader title="Weekly history" subtitle="Weekly averages (Last 12 weeks)" className="flex-1" />
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 tk-anim-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="tk-card h-44 animate-pulse bg-blush" />
          ))}
        </div>
      )}

      {error && (
        <div className="tk-card p-6 text-center tk-anim-2 bg-danger-soft mb-4">
          <p className="text-sm text-danger font-medium mb-3">{error}</p>
          <button onClick={fetchHistory} className="tk-pill-btn tk-btn-primary inline-flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="tk-card p-10 text-center tk-anim-2">
          <div className="tk-icon-circle w-16 h-16 mx-auto mb-4">
            <Calendar className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-2">No history yet</h3>
          <p className="text-muted text-sm max-w-sm mx-auto mb-6">
            Take your first scan to start building your weekly skin history. Averages will appear here.
          </p>
          <Link href="/capture" className="tk-pill-btn tk-btn-primary inline-flex">
            Take First Scan
          </Link>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 tk-anim-3">
          <ComponentErrorFallback title="History List">
            {history.map((week, idx) => (
              <div key={idx} className="tk-card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="tk-chip">
                    <Calendar className="w-3.5 h-3.5" />
                    {week.weekLabel}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {week.scanCount} {week.scanCount === 1 ? "scan" : "scans"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="shrink-0">
                    <p className="tk-eyebrow mb-1">Overall Average</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-semibold text-primary leading-none">
                        {typeof week.avgOverall === "number" ? week.avgOverall : "—"}
                      </span>
                      {typeof week.avgOverall === "number" && <span className="text-lg text-muted">/ 100</span>}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl bg-blush/60 p-4">
                    {METRICS.map(([key, label]) => {
                      const v = week.avgScores?.[key];
                      const ok = typeof v === "number";
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-medium text-muted">{label}</span>
                            <span className="text-sm font-semibold text-primary">{ok ? v : "—"}</span>
                          </div>
                          <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${ok ? v : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </ComponentErrorFallback>
        </div>
      )}
    </div>
  );
}
