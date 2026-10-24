"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { Camera, Image as ImageIcon, Loader2, Check, ScanFace, Lock, Sun, Sparkles, Smile, ArrowRight, RotateCw, Moon } from "lucide-react";
import { analyzeAndSaveSelfie, uploadSelfieServerAction, acceptScanConsent } from "@/app/lib/actions";
import { ensurePlan } from "@/app/lib/plan-actions";
import ScanConsentModal from "@/app/components/ScanConsentModal";
import ImageCropper from "@/app/components/ImageCropper";
import { useToast } from "@/app/components/ToastProvider";

const STAGES = [
  { id: "upload", label: "Uploading your photo" },
  { id: "analyze", label: "Analysing your skin" },
  { id: "plan", label: "Building your 30-day plan" },
];

const TIPS = [
  { icon: Sun, text: "Soft daylight, facing a window" },
  { icon: Sparkles, text: "No filters or heavy makeup" },
  { icon: Smile, text: "Relaxed face, looking straight on" },
];

function StageList({ current }) {
  const at = STAGES.findIndex((s) => s.id === current);
  return (
    <ol className="space-y-3 text-left max-w-xs mx-auto" aria-live="polite">
      {STAGES.map((s, i) => {
        const done = i < at;
        const active = i === at;
        return (
          <li key={s.id} className={`flex items-center gap-3 text-sm ${done || active ? "text-primary" : "text-muted"}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                done ? "bg-accent text-white" : active ? "bg-accent-soft text-accent" : "bg-line"
              }`}
            >
              {done ? <Check size={13} strokeWidth={3} /> : active ? <Loader2 size={13} className="animate-spin" /> : null}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

function Reveal({ plan, onStart }) {
  const score = plan.baseline?.overallScore;
  return (
    <div className="flex flex-col gap-4 tk-anim-1">
      <div className="text-center">
        <p className="tk-eyebrow">Your plan is ready</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-primary mt-1.5">Here&apos;s where you start</h1>
      </div>

      <section className="tk-card p-5 sm:p-6">
        <div className="flex items-center gap-5">
          <div className="text-center shrink-0">
            <p className="text-[3.25rem] font-semibold leading-none text-primary tabular-nums">{typeof score === "number" ? Math.round(score) : "—"}</p>
            <p className="text-xs text-muted mt-1">starting point</p>
          </div>
          <p className="text-sm text-primary/90 leading-relaxed">{plan.summary}</p>
        </div>

        {plan.progress.focus.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {plan.progress.focus.map((f) => (
              <li key={f.metric} className="flex items-center justify-between gap-3 rounded-xl bg-blush/70 px-3.5 py-2.5">
                <span className="text-sm font-semibold text-primary">{f.label}</span>
                <span className="text-sm text-muted tabular-nums">
                  {f.baseline} <ArrowRight size={12} className="inline -mt-0.5" /> <strong className="text-primary">{f.target}</strong> in {plan.durationDays} days
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tk-card p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-primary mb-3">Your first day</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { key: "am", title: "Morning", icon: Sun, steps: plan.steps.am },
            { key: "pm", title: "Evening", icon: Moon, steps: plan.steps.pm },
          ].map(({ key, title, icon: Icon, steps }) => (
            <div key={key}>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary mb-2"><Icon size={15} className="text-accent" /> {title}</p>
              <ul className="space-y-2">
                {steps.map((s) => (
                  <li key={s.id} className="text-sm text-primary/90 leading-snug">
                    {s.text}
                    {s.why && <span className="block text-xs text-muted mt-0.5">{s.why}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">New steps unlock as you go, and a check-in scan on day 7 shows how your skin is moving.</p>
      </section>

      <button type="button" onClick={onStart} className="tk-pill-btn tk-btn-primary w-full py-3.5 text-base">
        Start my plan
      </button>
    </div>
  );
}

export default function WelcomeClient({ firstName, goals, needsConsent: needsConsentInitial, hasScan }) {
  const router = useRouter();
  const { showToast } = useToast();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const pendingPick = useRef(null);
  const autoStarted = useRef(false);

  // intro | crop | preview | working | reveal
  const [phase, setPhase] = useState(hasScan ? "working" : "intro");
  const [stage, setStage] = useState(hasScan ? "plan" : "upload");
  const [error, setError] = useState("");
  const [rawImage, setRawImage] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanSaved, setScanSaved] = useState(hasScan);
  const [plan, setPlan] = useState(null);
  const [needsConsent, setNeedsConsent] = useState(needsConsentInitial);
  const [showConsent, setShowConsent] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

  const pick = (type) => {
    if (needsConsent) {
      pendingPick.current = type;
      setShowConsent(true);
      return;
    }
    (type === "camera" ? cameraRef : galleryRef).current?.click();
  };

  const acceptConsent = async (photoPrivacy) => {
    setSavingConsent(true);
    try {
      const res = await acceptScanConsent(photoPrivacy);
      if (!res.success) {
        showToast({ type: "error", title: "Couldn't save", message: res.error || "Please try again." });
        return;
      }
      setNeedsConsent(false);
      setShowConsent(false);
      const type = pendingPick.current || "gallery";
      pendingPick.current = null;
      (type === "camera" ? cameraRef : galleryRef).current?.click();
    } finally {
      setSavingConsent(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (rawImage) URL.revokeObjectURL(rawImage);
    setRawFile(f);
    setRawImage(URL.createObjectURL(f));
    setError("");
    setPhase("crop");
    e.target.value = "";
  };

  const onCropDone = (croppedFile, croppedUrl) => {
    setFile(croppedFile);
    setPreview(croppedUrl);
    setPhase("preview");
  };

  const onCropCancel = () => {
    setRawImage(null);
    setRawFile(null);
    setPhase(preview ? "preview" : "intro");
  };

  const buildPlan = async () => {
    setStage("plan");
    const res = await ensurePlan(tz());
    if (!res?.success || !res.plan) {
      setError(res?.error || "Your scan is saved, but we couldn't build your plan just now.");
      setPhase("working");
      setStage("plan_failed");
      return;
    }
    setPlan(res.plan);
    setPhase("reveal");
  };

  const run = async () => {
    setError("");
    setPhase("working");
    try {
      if (!scanSaved) {
        setStage("upload");
        const form = new FormData();
        form.append("file", file);
        const up = await uploadSelfieServerAction(form);
        if (!up.success) throw new Error(up.error || "Upload failed");

        setStage("analyze");
        const res = await analyzeAndSaveSelfie(up.url, tz());
        if (!res.success) {
          // The server releases the scan slot on failure, so trying again is free.
          setError(res.message || "We couldn't read that photo. Please try another.");
          setStage("upload_failed");
          return;
        }
        setScanSaved(true);
      }
      await buildPlan();
    } catch (err) {
      Sentry.captureException(err, { tags: { scope: "welcome-scan-unexpected" } });
      setError("Something went wrong. Please try again.");
      setStage(scanSaved ? "plan_failed" : "upload_failed");
    }
  };

  // Someone with a scan but no plan (an existing account) only needs the plan.
  useEffect(() => {
    if (!hasScan || autoStarted.current) return;
    autoStarted.current = true;
    buildPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPlan = () => {
    try { window.sessionStorage.setItem("tk:justScanned", "1"); } catch {}
    router.push("/routine");
  };

  const failed = stage === "upload_failed" || stage === "plan_failed";

  return (
    <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
      <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={onFile} className="sr-only" aria-hidden="true" tabIndex={-1} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={onFile} className="sr-only" aria-hidden="true" tabIndex={-1} />

      <div className="w-full max-w-lg">
        {phase === "reveal" && plan ? (
          <Reveal plan={plan} onStart={startPlan} />
        ) : phase === "crop" && rawImage ? (
          <div className="tk-card p-4 sm:p-6">
            <ImageCropper imageSrc={rawImage} originalFile={rawFile} onCropComplete={onCropDone} onCancel={onCropCancel} />
          </div>
        ) : phase === "working" ? (
          <section className="tk-card p-6 sm:p-8 text-center tk-anim-1" role="status" aria-label="Building your plan">
            <span className="tk-icon-circle w-14 h-14 mx-auto">{failed ? <ScanFace size={26} /> : <Loader2 size={26} className="animate-spin" />}</span>
            <h1 className="text-xl font-semibold text-primary mt-4">{failed ? "That didn’t quite work" : "Building your plan"}</h1>
            {failed ? (
              <>
                <p className="text-sm text-muted mt-2 max-w-sm mx-auto" role="alert">{error}</p>
                <button type="button" onClick={stage === "plan_failed" ? buildPlan : run} className="tk-pill-btn tk-btn-primary mt-5 px-6">
                  <RotateCw size={15} /> Try again
                </button>
                {stage === "upload_failed" && (
                  <button type="button" onClick={() => { setStage("upload"); setPhase("intro"); }} className="block mx-auto mt-3 text-sm font-medium text-muted hover:text-primary transition-colors">
                    Choose a different photo
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted mt-2 mb-6">This takes about 10 seconds.</p>
                <StageList current={stage} />
              </>
            )}
          </section>
        ) : phase === "preview" && preview ? (
          <section className="tk-card p-5 sm:p-6 text-center tk-anim-1">
            <h1 className="text-xl font-semibold text-primary">Looking good?</h1>
            <p className="text-sm text-muted mt-1">Your face should be clear and well lit.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your selfie preview" className="mx-auto mt-4 max-h-80 rounded-2xl object-cover" />
            <button type="button" onClick={run} className="tk-pill-btn tk-btn-primary w-full mt-5 py-3.5 text-base">
              Build my plan
            </button>
            <button type="button" onClick={() => pick("gallery")} className="block mx-auto mt-3 text-sm font-medium text-muted hover:text-primary transition-colors">
              Choose a different photo
            </button>
          </section>
        ) : (
          <section className="tk-card p-6 sm:p-8 text-center tk-anim-1">
            <span className="tk-icon-circle w-16 h-16 mx-auto"><ScanFace size={32} strokeWidth={1.5} /></span>
            <p className="tk-eyebrow mt-5">{firstName ? `Nice to meet you, ${firstName}` : "Last step"}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-primary leading-tight mt-1.5">One selfie builds your personal plan</h1>
            <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
              We read your skin, then build a 30-day plan around it
              {goals.length > 0 ? `, focused on ${goals.slice(0, 3).join(", ").toLowerCase()}` : ""}. A check-in scan each week shows it working.
            </p>

            <ul className="mt-5 space-y-2 text-left max-w-xs mx-auto">
              {TIPS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-primary/90">
                  <span className="tk-icon-circle w-8 h-8 shrink-0"><Icon size={15} /></span> {text}
                </li>
              ))}
            </ul>

            {error && <p className="text-sm text-danger mt-4" role="alert">{error}</p>}

            <button type="button" onClick={() => pick("camera")} className="tk-pill-btn tk-btn-primary w-full mt-6 py-3.5 text-base">
              <Camera size={18} /> Take a selfie
            </button>
            <button type="button" onClick={() => pick("gallery")} className="tk-pill-btn tk-btn-ghost w-full mt-2.5">
              <ImageIcon size={17} /> Upload a photo
            </button>
            <button type="button" onClick={() => router.push("/dashboard")} className="block mx-auto mt-4 text-sm font-medium text-muted hover:text-primary transition-colors">
              I&apos;ll do this later
            </button>
            <p className="text-xs text-muted mt-4 inline-flex items-center gap-1.5"><Lock size={12} /> Private and securely processed</p>
          </section>
        )}
      </div>

      <ScanConsentModal isOpen={showConsent} onAccept={acceptConsent} submitting={savingConsent} />
    </div>
  );
}
