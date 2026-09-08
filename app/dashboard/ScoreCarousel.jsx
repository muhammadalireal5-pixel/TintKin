"use client";

import { SKIN_METRICS, METRIC_LABELS } from "@/lib/constants/metrics";

export default function ScoreCarousel({ scores, weeklyScores }) {
  const metrics = [
    { key: SKIN_METRICS.WRINKLES, val: scores?.wrinkles, weeklyVal: weeklyScores?.wrinkles, label: METRIC_LABELS[SKIN_METRICS.WRINKLES] },
    { key: SKIN_METRICS.FIRMNESS, val: scores?.firmness, weeklyVal: weeklyScores?.firmness, label: METRIC_LABELS[SKIN_METRICS.FIRMNESS] },
    { key: SKIN_METRICS.SPOTS, val: scores?.spots, weeklyVal: weeklyScores?.spots, label: METRIC_LABELS[SKIN_METRICS.SPOTS] },
    { key: SKIN_METRICS.RADIANCE, val: scores?.radiance, weeklyVal: weeklyScores?.radiance, label: METRIC_LABELS[SKIN_METRICS.RADIANCE] },
  ];

  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 tk-anim-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted">Core Metrics</p>
        <span className="text-[10px] text-muted font-medium">4 Key Biomarkers</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map(({ key, val, weeklyVal, label }) => {
          const hasWeekly = typeof weeklyVal === "number";
          const delta = hasWeekly && typeof val === "number" ? val - weeklyVal : 0;
          return (
            <div
              key={key}
              className="tk-glass p-4 sm:p-5 transition-all relative overflow-hidden group flex flex-col justify-between h-[180px] sm:h-[195px] select-none"
            >
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-muted h-7 flex items-start leading-tight mb-1">
                  {label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-2xl sm:text-3xl font-display text-primary">{typeof val === "number" ? val : "—"}</p>
                  {hasWeekly && delta !== 0 && (
                    <span className={`text-xs font-semibold ${delta > 0 ? "text-sage" : "text-orange-400"}`}>
                      {delta > 0 ? `+${delta} ↑` : `${delta} ↓`}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
                  Week Avg: {hasWeekly ? weeklyVal : "—"}
                </p>
              </div>

              <div>
                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden relative">
                  <div
                    className="absolute h-full rounded-full transition-all duration-1000 ease-out z-10"
                    style={{
                      width: `${Math.min(100, Math.max(0, typeof val === "number" ? val : 0))}%`,
                      backgroundColor: typeof val === "number" && val > 75 ? "var(--tk-accent-sage)" : typeof val === "number" && val > 50 ? "#E8A838" : "#D4614B",
                    }}
                  />
                  {hasWeekly && (
                    <div
                      className="absolute h-full rounded-full transition-all duration-1000 ease-out opacity-30"
                      style={{
                        width: `${Math.min(100, Math.max(0, weeklyVal))}%`,
                        backgroundColor: "#6B7280",
                      }}
                    />
                  )}
                </div>
                <div className="h-6 flex items-center mt-2 overflow-hidden">
                  {val > 75 ? (
                    <p className="text-[10px] text-sage font-medium leading-tight truncate">
                      {key === "wrinkles" ? `Top resilience (${val}%)` : "Optimal vitality"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted font-medium leading-tight truncate">
                      {val > 50 ? "Steady daily routine" : "Targeted care needed"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
