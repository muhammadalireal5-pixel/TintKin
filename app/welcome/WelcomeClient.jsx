"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensurePlan } from "@/app/lib/plan-actions";
import Link from "next/link";
import KinAvatar from "@/app/components/companion/KinAvatar";
import BuildingScreen from "./BuildingScreen";
import PlanReveal from "./PlanReveal";

/**
 * Right after onboarding: the plan is built from the person's answers (no
 * selfie needed), the building screen explains what the engine did with them,
 * then the reveal shows the plan as cards and Kin asks if it feels right.
 */
export default function WelcomeClient({ firstName, profile, hasScan = false }) {
  const started = useRef(false);
  const [scanChoiceMade, setScanChoiceMade] = useState(hasScan);
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
    if (!scanChoiceMade || started.current) return;
    started.current = true;
    build();
  }, [build, scanChoiceMade]);

  const onDone = useCallback(() => setAnimDone(true), []);

  if (!scanChoiceMade) return (
    <div className="flex-1 flex items-center justify-center px-5 py-8">
      <section className="tk-card w-full max-w-lg p-6 sm:p-8">
        <KinAvatar size={64} />
        <p className="tk-eyebrow mt-4">Optional · YouCam skin analysis</p>
        <h1 className="text-2xl font-semibold text-primary mt-2">Add a selfie before we build your plan?</h1>
        <p className="text-muted mt-3">YouCam measures wrinkles, firmness, spots and radiance. We can include those scores as your plan’s starting baseline so future scans show what changes.</p>
        <p className="text-sm text-muted mt-3">Your answers still guide your routine and safety limits. A photo is optional, and you choose how it is stored before uploading. This is skin wellness, not a diagnosis.</p>
        <Link href="/capture?setup=plan" className="tk-pill-btn tk-btn-primary w-full mt-6">Add a selfie with YouCam</Link>
        <button type="button" onClick={() => setScanChoiceMade(true)} className="tk-pill-btn tk-btn-ghost w-full mt-3">Build my plan without a selfie</button>
      </section>
    </div>
  );

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
