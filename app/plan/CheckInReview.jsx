"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircleHeart } from "lucide-react";
import { reviewCheckIn } from "@/app/lib/plan-actions";

/**
 * Shown on the plan page right after a check-in scan: asks the coach to look at
 * the new result and adjust the rest of the plan, then shows what it said. The
 * server only answers each check-in once, so a reload or a double tap is safe.
 */
export default function CheckInReview() {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState("reviewing"); // reviewing | done | skipped
  const [note, setNote] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    reviewCheckIn(tz).then((res) => {
      if (res?.success && res.adjusted) {
        setNote(res.note || "");
        setState("done");
        router.refresh();
      } else {
        // Nothing changed (or the coach is unavailable): leave the plan as it is.
        setState("skipped");
      }
    });
  }, [router]);

  if (state === "skipped") return null;

  return (
    <section className="tk-card p-5 bg-accent-soft/40 border-accent/30" role="status" aria-live="polite" aria-label="Check-in review">
      <div className="flex items-start gap-3">
        <span className="tk-icon-circle w-10 h-10 bg-white shrink-0">
          {state === "reviewing" ? <Loader2 size={18} className="animate-spin" /> : <MessageCircleHeart size={18} />}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary">
            {state === "reviewing" ? "Reviewing your check-in…" : "Your plan has been updated"}
          </p>
          <p className="text-sm text-muted mt-0.5">
            {state === "reviewing" ? "Looking at how your skin has moved and what to change next." : note}
          </p>
        </div>
      </div>
    </section>
  );
}
