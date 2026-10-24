import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

/**
 * "Your first week": the few things that make the plan work, ticked off as they
 * happen. Shown until they are all done (or two weeks in), so a new user always
 * sees exactly what to do next.
 */
export default function FirstWeekChecklist({ items }) {
  const done = items.filter((i) => i.done).length;
  if (done >= items.length) return null;
  const next = items.find((i) => !i.done);

  return (
    <section className="tk-card p-4 sm:p-5" aria-label="Your first week">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-[15px] font-semibold text-primary">Your first week</h2>
        <span className="text-xs text-muted tabular-nums">{done} of {items.length} done</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => {
          const isNext = i === next;
          const row = (
            <>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${i.done ? "bg-accent text-white" : isNext ? "ring-2 ring-accent bg-accent-soft" : "bg-line"}`}
                aria-hidden="true"
              >
                {i.done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${i.done ? "text-muted line-through" : "font-medium text-primary"}`}>{i.label}</span>
                {isNext && i.hint && <span className="block text-xs text-muted mt-0.5">{i.hint}</span>}
              </span>
              {isNext && <ChevronRight size={16} className="text-muted shrink-0" />}
            </>
          );
          return (
            <li key={i.label}>
              {isNext && i.href ? (
                <Link href={i.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-blush/60 transition-colors">{row}</Link>
              ) : (
                <div className="flex items-center gap-3 px-2 py-2">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
