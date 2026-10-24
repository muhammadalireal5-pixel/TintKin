"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensurePlan } from "@/app/lib/plan-actions";
import BuildingScreen from "./BuildingScreen";
import PlanReveal from "./PlanReveal";

/**
 * Right after onboarding: the plan is built from the person's answers (no
 * selfie needed), the building screen explains what the engine did with them,
 * then the reveal shows the plan as cards and Kin asks if it feels right.
 */
export default function WelcomeClient({ firstName, profile }) {
  const started = useRef(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [animDone, setAnimDone] = useState(false);

  const build = useCallback(async () => {
    setError("");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await ensurePlan(tz);
    if (res?.success && res.plan) setPlan(res.plan);
    else setError(res?.error || "We couldn't build your plan just now.");
  }, []);

  useEffect(() => {
    // Strict Mode runs effects twice in development; one build is enough.
    if (started.current) return;
    started.current = true;
    build();
  }, [build]);

  const onDone = useCallback(() => setAnimDone(true), []);

  return (
    <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
      <div className="w-full max-w-lg">
        {plan && animDone ? (
          <PlanReveal plan={plan} profile={profile} firstName={firstName} />
        ) : (
          <BuildingScreen profile={profile} ready={Boolean(plan)} error={error} onRetry={build} onDone={onDone} />
        )}
      </div>
    </div>
  );
}
