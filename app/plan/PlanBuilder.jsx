"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, RotateCw } from "lucide-react";
import { ensurePlan } from "@/app/lib/plan-actions";

/**
 * Builds the user's first plan from their skin profile (no scan needed), then
 * refreshes the server-rendered page. Used wherever a user has no plan yet
 * (every existing account the first time they open the app after this ships).
 */
export default function PlanBuilder({ compact = false }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState("building"); // building | error
  const [message, setMessage] = useState("");

  const build = async () => {
    setState("building");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await ensurePlan(tz);
    if (!res?.success) {
      setMessage(res?.error || "We couldn't build your plan just now.");
      setState("error");
    } else {
      router.refresh();
    }
  };

  useEffect(() => {
    // Strict Mode runs effects twice in development; one build is enough.
    if (started.current) return;
    started.current = true;
    build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={`tk-card ${compact ? "p-4 sm:p-5" : "p-6 sm:p-8"} text-center`} role="status" aria-live="polite" aria-label="Your plan">
      <span className="tk-icon-circle w-12 h-12 mx-auto">
        {state === "building" ? <Loader2 size={22} className="animate-spin" /> : <Sparkles size={22} />}
      </span>
      {state === "building" && (
        <>
          <h2 className="text-lg font-semibold text-primary mt-4">Building your 30-day plan</h2>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            Choosing the steps that fit your skin, your goals and your routine. This takes a few seconds.
          </p>
        </>
      )}
      {state === "error" && (
        <>
          <h2 className="text-lg font-semibold text-primary mt-4">Your plan isn&apos;t ready yet</h2>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{message}</p>
          <button type="button" onClick={build} className="tk-pill-btn tk-btn-primary mt-4 px-6">
            <RotateCw size={15} /> Try again
          </button>
        </>
      )}
    </section>
  );
}
