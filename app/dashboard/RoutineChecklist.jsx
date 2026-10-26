"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Sun, Moon, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveRoutineCompletion, saveWorkoutCompletion } from "@/app/lib/actions";
import SegmentedTabs from "@/app/components/ui/SegmentedTabs";
import { refreshCompanion, kinSay } from "@/app/components/companion/store";
import { ROUTINE_PRAISE } from "@/app/components/companion/brain";
import { getProductGuidance } from "@/lib/constants/productGuidance";
import ProductImage from "./ProductImage";
import { productForStep, whyLine } from "@/app/plan/plan-products";

function RoutineCheckbox({ checked }) {
  return (
    <motion.div
      whileTap={{ scale: 0.82 }}
      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
        checked ? "bg-accent border-accent text-white" : "border-[var(--tk-border-strong)] bg-paper"
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

// A step is either plain text (an older, scan-based routine) or a plan step
// ({ id, text, why }). `key` is what gets saved when it is ticked.
const asItem = (step) => (typeof step === "string" ? { key: step, text: step, why: "" } : { key: step.id, text: step.text, why: step.why || "" });

/** One compact product row under an expanded step: picture, name, why it fits, and how to use it. */
function StepProduct({ product }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const guide = getProductGuidance(product.type);
  const why = whyLine(product);
  return (
    <div className="mt-2.5 rounded-xl border border-line bg-paper p-2.5">
      <div className="flex items-center gap-3">
        <span className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-line bg-accent-soft">
          <ProductImage type={product.type} alt={product.formula || product.type} className="object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-primary truncate">{product.formula || product.type}</span>
          {why && <span className="block text-xs text-muted truncate">{why}</span>}
        </span>
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          aria-expanded={guideOpen}
          className="shrink-0 tk-pill-btn tk-btn-ghost px-3 py-1.5 text-xs"
        >
          How to use
        </button>
      </div>
      {guideOpen && (
        <div className="mt-2.5 pt-2.5 border-t border-line text-xs text-muted leading-relaxed">
          <p><span className="font-medium text-primary/80">When: </span>{guide.when}</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {guide.how.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepRow({ item, checked, isNew, onToggle, chip = null, children = null }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div className="flex items-center min-h-11">
        <button
          type="button"
          data-kin="routine"
          onClick={() => onToggle(item.key)}
          aria-pressed={checked}
          className="flex-1 min-w-0 min-h-11 flex items-center gap-3 text-left px-1 py-2"
        >
          <RoutineCheckbox checked={checked} />
          <span className={`min-w-0 text-[15px] leading-snug ${checked ? "text-muted line-through" : "text-primary"}`}>
            {item.text}
            {isNew && <span className="tk-chip tk-chip-success ml-2 align-middle">New this week</span>}
            {chip && <span className="tk-chip ml-2 align-middle">{chip}</span>}
          </span>
        </button>
        {children && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? `Hide details for ${item.text}` : `Show details for ${item.text}`}
            className="shrink-0 w-11 h-11 flex items-center justify-center text-muted hover:text-primary transition-colors"
          >
            <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && children && <div className="pl-10 pr-1 pb-3">{children}</div>}
    </li>
  );
}

function StepList({ id, steps, checks, onToggle, newStepIds, products, workout, emptyText }) {
  const items = (steps || []).map(asItem);
  if (items.length === 0 && !workout) return <p className="text-sm text-muted py-3">{emptyText}</p>;
  return (
    <ul id={id} className="divide-y divide-line">
      {items.map((item) => {
        const product = productForStep(item.text, products);
        return (
          <StepRow key={item.key} item={item} checked={checks.includes(item.key)} isNew={newStepIds.includes(item.key)} onToggle={onToggle}>
            {item.why || product ? (
              <>
                {item.why && (
                  <p className="text-sm text-muted leading-relaxed">
                    <span className="font-medium text-primary/80">Why this is for you: </span>{item.why}
                  </p>
                )}
                {product && <StepProduct product={product} />}
              </>
            ) : null}
          </StepRow>
        );
      })}
      {workout && (
        <StepRow item={{ key: "workout", text: workout.title }} checked={workout.done} onToggle={workout.onToggle} chip="Workout">
          <p className="text-sm text-muted leading-relaxed">{workout.detail}</p>
        </StepRow>
      )}
    </ul>
  );
}

// Morning before 4pm local time, evening after. Read through useSyncExternalStore so the
// server render and hydration use "am" and the client then swaps in the real one.
const noopSubscribe = () => () => {};
const autoTabNow = () => (new Date().getHours() < 16 ? "am" : "pm");

export default function RoutineChecklist({
  amRoutine,
  pmRoutine,
  completedAm = [],
  completedPm = [],
  initialTab = null,
  newStepIds = [],
  products = [],
  facialWorkout = "",
  workoutDone = false,
}) {
  const [amChecks, setAmChecks] = useState(completedAm);
  const [pmChecks, setPmChecks] = useState(completedPm);
  const [workoutChecked, setWorkoutChecked] = useState(workoutDone);
  const [picked, setPicked] = useState(initialTab === "pm" || initialTab === "am" ? initialTab : null);
  const autoTab = useSyncExternalStore(noopSubscribe, autoTabNow, () => "am");
  const tab = picked ?? autoTab;

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

  const toggleCheck = async (time, step) => {
    let newChecks;
    if (time === "am") {
      newChecks = amChecks.includes(step) ? amChecks.filter((s) => s !== step) : [...amChecks, step];
      setAmChecks(newChecks);
    } else {
      newChecks = pmChecks.includes(step) ? pmChecks.filter((s) => s !== step) : [...pmChecks, step];
      setPmChecks(newChecks);
    }
    await saveRoutineCompletion(time, step, newChecks.includes(step), tz());
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

  const toggleWorkout = async () => {
    const next = !workoutChecked;
    setWorkoutChecked(next);
    await saveWorkoutCompletion(next, tz());
    refreshCompanion();
  };

  const [workoutTitle, ...workoutRest] = (facialWorkout || "").split(":");
  const hasDetail = Boolean(facialWorkout) && facialWorkout.includes(":");
  const workout = facialWorkout
    ? {
        title: hasDetail ? workoutTitle.trim() : "Targeted facial workout",
        detail: hasDetail ? workoutRest.join(":").trim() : facialWorkout,
        done: workoutChecked,
        onToggle: toggleWorkout,
      }
    : null;

  const total = (tab === "am" ? amRoutine : pmRoutine)?.length || 0;
  const done = tab === "am" ? amChecks.length : pmChecks.length;
  const complete = total > 0 && done >= total;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SegmentedTabs
          className="flex-1"
          label="Routine time"
          value={tab}
          onChange={setPicked}
          items={[
            { id: "am", label: "Morning", icon: <Sun size={15} /> },
            { id: "pm", label: "Evening", icon: <Moon size={15} /> },
          ]}
        />
        {total > 0 && (
          <span className={`tk-chip tabular-nums shrink-0 ${complete ? "tk-chip-success" : ""}`} aria-label={`${done} of ${total} steps done`}>
            {done}/{total}
          </span>
        )}
      </div>

      {/* Both lists share one grid cell and the hidden one keeps its space, so the
          card is as tall as the longer list and switching never changes the page height. */}
      <section className="tk-card px-4 sm:px-5 py-1 grid" aria-label="Routine">
        <div className={`col-start-1 row-start-1 ${tab === "am" ? "" : "invisible pointer-events-none"}`} aria-hidden={tab !== "am"} inert={tab !== "am"}>
          <StepList id="morning" steps={amRoutine} checks={amChecks} onToggle={(s) => toggleCheck("am", s)} newStepIds={newStepIds} products={products} workout={workout} emptyText="Take a selfie to get your personalised morning routine." />
        </div>
        <div className={`col-start-1 row-start-1 ${tab === "pm" ? "" : "invisible pointer-events-none"}`} aria-hidden={tab !== "pm"} inert={tab !== "pm"}>
          <StepList id="evening" steps={pmRoutine} checks={pmChecks} onToggle={(s) => toggleCheck("pm", s)} newStepIds={newStepIds} products={products} workout={workout} emptyText="Take a selfie to get your personalised evening routine." />
        </div>
      </section>
    </div>
  );
}
