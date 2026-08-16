"use client";

import { useEffect, useState } from "react";
import { getWeeklyHistory } from "@/app/lib/actions";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeeklyHistory().then((data) => {
      setHistory(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lavender/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-100/40 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        
        <div className="flex items-center gap-4 mb-10 tk-anim-1">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/50 border border-white/60 flex items-center justify-center text-muted hover:text-primary hover:bg-white transition-colors shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-medium text-primary">Score History</h1>
            <p className="text-sm text-muted">Weekly averages (Last 12 weeks)</p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col gap-4 tk-anim-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tk-glass p-6 rounded-3xl h-40 animate-pulse bg-white/30" />
            ))}
          </div>
        )}

        {!loading && history.length === 0 && (
          <div className="tk-glass p-12 text-center rounded-3xl tk-anim-2 border border-white/50 bg-white/40">
            <div className="w-16 h-16 bg-sage/10 text-sage rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-medium text-primary mb-2">No history yet</h3>
            <p className="text-muted text-sm max-w-sm mx-auto mb-6">
              Take your first scan to start building your weekly skin history. Averages will appear here.
            </p>
            <Link href="/capture" className="tk-pill-btn tk-btn-primary inline-flex">
              Take First Scan
            </Link>
          </div>
        )}

        {!loading && history.length > 0 && (
          <div className="flex flex-col gap-6 tk-anim-3">
            <ComponentErrorFallback title="History List">
            {history.map((week, idx) => (
              <div key={idx} className="tk-glass rounded-3xl p-6 sm:p-8 border border-white/50 hover:border-white/80 transition-colors bg-white/40 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sage/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:bg-sage/10 transition-colors" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/60 text-primary border border-white">
                        <Calendar className="w-3.5 h-3.5" />
                        {week.weekLabel}
                      </span>
                      <span className="text-xs font-medium text-muted">
                        {week.scanCount} {week.scanCount === 1 ? 'scan' : 'scans'}
                      </span>
                    </div>

                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Overall Average</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-display font-medium text-primary leading-none">{week.avgOverall}</span>
                          <span className="text-lg text-muted">/ 100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full max-w-md bg-white/50 p-5 rounded-2xl border border-white/60 shadow-sm">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      
                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-medium text-muted">Wrinkles</span>
                          <span className="text-sm font-semibold text-primary">{week.avgScores.wrinkles}</span>
                        </div>
                        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                          <div className="h-full bg-sage rounded-full" style={{ width: `${week.avgScores.wrinkles}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-medium text-muted">Firmness</span>
                          <span className="text-sm font-semibold text-primary">{week.avgScores.firmness}</span>
                        </div>
                        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                          <div className="h-full bg-sage rounded-full" style={{ width: `${week.avgScores.firmness}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-medium text-muted">Spots</span>
                          <span className="text-sm font-semibold text-primary">{week.avgScores.spots}</span>
                        </div>
                        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${week.avgScores.spots}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-medium text-muted">Radiance</span>
                          <span className="text-sm font-semibold text-primary">{week.avgScores.radiance}</span>
                        </div>
                        <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${week.avgScores.radiance}%` }} />
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            ))}
            </ComponentErrorFallback>
          </div>
        )}
      </div>
    </div>
  );
}
