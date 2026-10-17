"use client";

import { useState } from "react";
import { Check, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveRoutineCompletion } from "@/app/lib/actions";
import SegmentedTabs from "@/app/components/ui/SegmentedTabs";
import { refreshCompanion, kinSay } from "@/app/components/companion/store";
import { ROUTINE_PRAISE } from "@/app/components/companion/brain";

function RoutineCheckbox({ checked }) {
  return (
    <motion.div
      whileTap={{ scale: 0.82 }}
      className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
        checked ? "bg-accent border-accent text-white" : "border-[var(--tk-border-strong)] bg-white"
      }`}
    >
      <AnimatePresence>
        {checked && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            <Check size={13} strokeWidth={3.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProgressRing({ done, total }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <div className="relative w-[4.5rem] h-[4.5rem] shrink-0" role="img" aria-label={`${done} of ${total} steps done`}>
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--tk-accent-soft)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--tk-accent)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

function StepList({ title, icon: Icon, steps, checks, onToggle, emptyText, id }) {
  const total = steps?.length || 0;
  const done = checks.length;
  const complete = total > 0 && done >= total;
  return (
    <section id={id} className="tk-card p-5 sm:p-6 scroll-mt-20" aria-label={title}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-primary">
          <span className="tk-icon-circle w-8 h-8"><Icon size={16} /></span>
          {title}
        </h3>
        {total > 0 && (
          <span className={`tk-chip tabular-nums ${complete ? "tk-chip-success" : ""}`}>
            {complete ? "All done" : `${done}/${total}`}
          </span>
        )}
      </div>

      {total > 0 ? (
        <ul className="space-y-1">
          {steps.map((step, idx) => {
            const checked = checks.includes(step);
            return (
              <li key={idx}>
                <button
                  type="button"
                  data-kin="routine"
                  onClick={() => onToggle(step)}
                  aria-pressed={checked}
                  className="w-full flex items-start gap-3 text-left rounded-xl px-2 py-2.5 hover:bg-blush/60 transition-colors"
                >
                  <RoutineCheckbox checked={checked} />
                  <span className={`text-[15px] leading-snug ${checked ? "text-muted line-through" : "text-primary"}`}>
                    {step}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
    </section>
  );
}

export default function RoutineChecklist({ amRoutine, pmRoutine, completedAm = [], completedPm = [], initialTab = "am" }) {
  const [amChecks, setAmChecks] = useState(completedAm);
  const [pmChecks, setPmChecks] = useState(completedPm);
  const [tab, setTab] = useState(initialTab === "pm" ? "pm" : "am");

  const toggleCheck = async (time, step) => {
    let newChecks;
    if (time === "am") {
      newChecks = amChecks.includes(step) ? amChecks.filter(s => s !== step) : [...amChecks, step];
      setAmChecks(newChecks);
    } else {
      newChecks = pmChecks.includes(step) ? pmChecks.filter(s => s !== step) : [...pmChecks, step];
      setPmChecks(newChecks);
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await saveRoutineCompletion(time, step, newChecks.includes(step), tz);
    refreshCompanion();
    if (newChecks.includes(step)) {
      const amN = time === "am" ? newChecks.length : amChecks.length;
      const pmN = time === "pm" ? newChecks.length : pmChecks.length;
      const total = (amRoutine?.length || 0) + (pmRoutine?.length || 0);
      const left = total - amN - pmN;
      const sideDone = newChecks.length >= ((time === "am" ? amRoutine : pmRoutine)?.length || 0);
      kinSay(left <= 0 ? ROUTINE_PRAISE.all : sideDone ? ROUTINE_PRAISE[time] : ROUTINE_PRAISE.step(left));
    }
  };

  const amTotal = amRoutine?.length || 0;
  const pmTotal = pmRoutine?.length || 0;
  const total = amTotal + pmTotal;
  const done = amChecks.length + pmChecks.length;

  const message = total === 0
    ? "Take a scan to get your personalised routine."
    : done >= total
      ? "Everything done today. Lovely work."
      : done === 0
        ? "Tick steps off as you go."
        : "Nice progress, keep going.";

  return (
    <div className="flex flex-col gap-4">
      <div className="tk-card p-5 flex items-center gap-4">
        <ProgressRing done={done} total={total} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary">Today&apos;s Plan</p>
          <p className="text-sm text-muted mt-0.5">
            {total > 0 ? `${done} of ${total} steps completed` : "No routine yet"}
          </p>
          <p className="text-xs text-muted mt-1">{message}</p>
        </div>
      </div>

      {/* Phone: one routine at a time. Desktop: both side by side. */}
      <SegmentedTabs
        className="md:hidden"
        label="Routine time"
        value={tab}
        onChange={setTab}
        items={[
          { id: "am", label: "Morning", icon: <Sun size={15} /> },
          { id: "pm", label: "Evening", icon: <Moon size={15} /> },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className={tab === "am" ? "" : "hidden md:block"}>
          <StepList
            id="morning"
            title="Morning Routine"
            icon={Sun}
            steps={amRoutine}
            checks={amChecks}
            onToggle={(s) => toggleCheck("am", s)}
            emptyText="Take a selfie to get your personalised AM routine."
          />
        </div>
        <div className={tab === "pm" ? "" : "hidden md:block"}>
          <StepList
            id="evening"
            title="Evening Routine"
            icon={Moon}
            steps={pmRoutine}
            checks={pmChecks}
            onToggle={(s) => toggleCheck("pm", s)}
            emptyText="Take a selfie to get your personalised PM routine."
          />
        </div>
      </div>
    </div>
  );
}
