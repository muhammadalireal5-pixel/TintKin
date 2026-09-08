"use client";

import { useState } from "react";
import { Check, Sun, Moon } from "lucide-react";
import { saveRoutineCompletion } from "@/app/lib/actions";

export default function RoutineChecklist({ amRoutine, pmRoutine, completedAm = [], completedPm = [] }) {
  const [amChecks, setAmChecks] = useState(completedAm);
  const [pmChecks, setPmChecks] = useState(completedPm);

  const toggleCheck = async (time, step) => {
    let newChecks;
    if (time === "am") {
      newChecks = amChecks.includes(step) ? amChecks.filter(s => s !== step) : [...amChecks, step];
      setAmChecks(newChecks);
    } else {
      newChecks = pmChecks.includes(step) ? pmChecks.filter(s => s !== step) : [...pmChecks, step];
      setPmChecks(newChecks);
    }
    await saveRoutineCompletion(time, step, newChecks.includes(step));
  };

  const amTotal = amRoutine?.length || 0;
  const pmTotal = pmRoutine?.length || 0;
  const amDone = amChecks.length;
  const pmDone = pmChecks.length;
  const amComplete = amTotal > 0 && amDone >= amTotal;
  const pmComplete = pmTotal > 0 && pmDone >= pmTotal;

  return (
    <div className="tk-glass p-6 sm:p-8 rounded-3xl w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-medium text-primary">Daily Routine</h2>
        {amTotal > 0 && pmTotal > 0 && (
          <p className="text-xs font-semibold text-muted tabular-nums">
            {amDone + pmDone} / {amTotal + pmTotal} <span className="hidden sm:inline">done today</span>
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">

        {/* AM */}
        <div>
          {/* Section header with accent bar */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sun size={14} className="text-[#E8A838]" />
              <h3 className="text-sm font-semibold tracking-widest uppercase text-muted">AM Routine</h3>
            </div>
            {amTotal > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${amComplete ? 'bg-sage/15 text-sage' : 'bg-black/5 text-muted'}`}>
                {amComplete ? '✓ All done!' : `${amDone}/${amTotal}`}
              </span>
            )}
          </div>

          {amRoutine && amRoutine.length > 0 ? (
            <ul className="space-y-3">
              {amRoutine.map((step, idx) => {
                const checked = amChecks.includes(step);
                return (
                  <li key={idx} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggleCheck("am", step)}>
                    <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${checked ? 'bg-sage border-sage text-[#2C3E50]' : 'border-gray-300 group-hover:border-sage/50'}`}>
                      {checked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`text-sm leading-snug transition-colors ${checked ? 'text-muted line-through' : 'text-primary group-hover:text-sage'}`}>{step}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted italic">Take a selfie to get your personalized AM routine.</p>
          )}
        </div>

        {/* PM */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Moon size={14} className="text-[#792CA2]" />
              <h3 className="text-sm font-semibold tracking-widest uppercase text-muted">PM Routine</h3>
            </div>
            {pmTotal > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${pmComplete ? 'bg-lavender text-[#792CA2]' : 'bg-black/5 text-muted'}`}>
                {pmComplete ? '✓ All done!' : `${pmDone}/${pmTotal}`}
              </span>
            )}
          </div>

          {pmRoutine && pmRoutine.length > 0 ? (
            <ul className="space-y-3">
              {pmRoutine.map((step, idx) => {
                const checked = pmChecks.includes(step);
                return (
                  <li key={idx} className="flex items-start gap-3 cursor-pointer group" onClick={() => toggleCheck("pm", step)}>
                    <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${checked ? 'bg-lavender border-lavender text-[#792CA2]' : 'border-gray-300 group-hover:border-lavender'}`}>
                      {checked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`text-sm leading-snug transition-colors ${checked ? 'text-muted line-through' : 'text-primary group-hover:text-[#792CA2]'}`}>{step}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted italic">Take a selfie to get your personalized PM routine.</p>
          )}
        </div>
      </div>
    </div>
  );
}
