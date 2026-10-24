"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, Loader2, ArrowLeft, ArrowRight, ShieldCheck,
  Droplets, Sun, Wind, Sparkles, Layers, Flame, Moon, Cigarette, Baby,
} from "lucide-react";
import { completeOnboarding } from "@/app/lib/actions";
import {
  SKIN_TYPES, SEX_OPTIONS, CONCERNS, CONCERN_KEYS, MAX_CONCERNS, RATING_LABELS,
  SENSITIVITY_OPTIONS, SUN_REACTIONS, CURRENT_PRODUCTS, SLEEP_OPTIONS, OUTDOOR_OPTIONS,
  STRESS_OPTIONS, PREGNANCY_OPTIONS, ROUTINE_TIME_OPTIONS,
} from "@/lib/constants/profile";
import { validateOnboarding } from "@/lib/validations/onboarding";

const SKIN_TYPE_INFO = {
  oily: { icon: Droplets, hint: "Shiny by midday, larger pores" },
  dry: { icon: Wind, hint: "Tight or flaky, rarely shiny" },
  combination: { icon: Layers, hint: "Oily T-zone, drier cheeks" },
  normal: { icon: Sparkles, hint: "Balanced, rarely troublesome" },
  sensitive: { icon: Flame, hint: "Stings or flushes easily" },
};

const RATING_TONES = [
  "",
  "bg-danger-soft text-danger border-danger/40",
  "bg-accent-soft text-accent-deep border-accent/40",
  "bg-blush text-primary border-line",
  "bg-success-soft text-success border-success/40",
  "bg-success text-white border-success",
];

const STEPS = [
  { id: "about", title: "About you", sub: "Age and sex change which ingredients are right for you." },
  { id: "type", title: "Your skin type", sub: "How your skin behaves on a normal day." },
  { id: "sun", title: "How does your skin react to sun?", sub: "This sets how strongly we protect it, and how gently we treat marks." },
  { id: "concerns", title: "What do you want to improve?", sub: `Pick up to ${MAX_CONCERNS}. Tap your most important one first.` },
  { id: "rate", title: "How are they right now?", sub: "Be honest, this is your starting point. We measure change against it." },
  { id: "routine", title: "What do you already use?", sub: "So we build on your routine instead of doubling up." },
  { id: "life", title: "Your daily life", sub: "Sleep, sun and stress all show up on skin." },
  { id: "safety", title: "Last two things", sub: "Safety first, then how much time you have." },
];

const tile = (on) =>
  `w-full text-left p-3.5 rounded-2xl border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    on ? "bg-accent-soft border-accent text-accent-deep shadow-sm" : "bg-white border-line text-primary hover:border-accent/50"
  }`;

function Choice({ on, onClick, children, hint, icon: Icon, className = "" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`${tile(on)} ${className}`}>
      <span className="flex items-center gap-3">
        {Icon && (
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${on ? "bg-accent text-white" : "bg-blush text-accent"}`}>
            <Icon size={17} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block">{children}</span>
          {hint && <span className="block text-xs font-normal text-muted mt-0.5">{hint}</span>}
        </span>
        {on && <Check size={16} className="shrink-0" />}
      </span>
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-sm font-medium text-primary mb-2">{label}</p>
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    birthDate: "",
    sex: "",
    skinType: "",
    sensitivity: "",
    phototype: 0,
    concerns: [], // ordered keys, first = top priority
    ratings: {},
    currentProducts: [],
    sleep: "",
    outdoor: "",
    smoker: null,
    stress: "",
    pregnancy: "",
    routineTime: "",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const male = form.sex === "male";

  const toggleConcern = (key) => {
    setForm((f) => {
      if (f.concerns.includes(key)) return { ...f, concerns: f.concerns.filter((k) => k !== key) };
      if (f.concerns.length >= MAX_CONCERNS) return f;
      return { ...f, concerns: [...f.concerns, key] };
    });
  };
  const toggleProduct = (value) =>
    setForm((f) => ({
      ...f,
      currentProducts: f.currentProducts.includes(value) ? f.currentProducts.filter((p) => p !== value) : [...f.currentProducts, value],
    }));

  const missing = (id) => {
    switch (id) {
      case "about": return !form.birthDate || !form.sex ? "Please add your date of birth and sex to continue." : "";
      case "type": return !form.skinType || !form.sensitivity ? "Please pick your skin type and how reactive it is." : "";
      case "sun": return !form.phototype ? "Please pick the closest match." : "";
      case "concerns": return form.concerns.length === 0 ? "Please pick at least one concern." : "";
      case "rate": return form.concerns.some((k) => !form.ratings[k]) ? "Please rate each concern." : "";
      case "life": return !form.sleep || !form.outdoor || !form.stress || form.smoker === null ? "Please answer each question." : "";
      case "safety": return (!male && !form.pregnancy) || !form.routineTime ? "Please answer both to build a safe plan." : "";
      default: return "";
    }
  };

  const next = async () => {
    const problem = missing(STEPS[step].id);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    const payload = {
      birthDate: form.birthDate,
      sex: form.sex,
      skinType: form.skinType,
      concerns: form.concerns.map((key) => ({ key, rating: form.ratings[key] })),
      sensitivity: form.sensitivity,
      phototype: form.phototype,
      currentProducts: form.currentProducts,
      sleep: form.sleep,
      outdoor: form.outdoor,
      smoker: form.smoker === true,
      stress: form.stress,
      pregnancy: male ? "no" : form.pregnancy,
      routineTime: form.routineTime,
    };
    const validation = validateOnboarding(payload);
    if (!validation.isValid) {
      setError(validation.error || "Please check your answers.");
      return;
    }
    setLoading(true);
    try {
      const res = await completeOnboarding(payload);
      if (res.success) {
        router.replace("/welcome");
      } else {
        setError(res.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong, please try again later");
      setLoading(false);
    }
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
      <div className="w-full max-w-md">
        <div className="tk-card overflow-hidden tk-anim-1">
          <div className="bg-gradient-to-br from-accent-soft via-blush to-surface px-6 sm:px-8 pt-6 pb-5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="tk-eyebrow">Step {step + 1} of {STEPS.length}</p>
              {step > 0 && (
                <button type="button" onClick={back} disabled={loading} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-primary disabled:opacity-50">
                  <ArrowLeft size={13} /> Back
                </button>
              )}
            </div>
            <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
              {STEPS.map((s, i) => (
                <span key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-white/70"}`} />
              ))}
            </div>
            <h1 key={current.id} className="text-2xl sm:text-[1.7rem] font-semibold text-primary leading-tight mt-5 mb-1.5 tk-anim-2">{current.title}</h1>
            <p className="text-sm text-muted">{current.sub}</p>
          </div>

          <div className="px-6 sm:px-8 py-6">
            {error && (
              <div className="bg-danger-soft text-danger p-3 rounded-xl text-sm mb-5 border border-danger/20" role="alert">{error}</div>
            )}

            <div key={current.id} className="space-y-5 tk-anim-2">
              {current.id === "about" && (
                <>
                  <Field label="Date of birth">
                    <input type="date" value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} className="tk-input" />
                  </Field>
                  <Field label="Sex">
                    <div className="grid grid-cols-2 gap-2">
                      {SEX_OPTIONS.map((opt) => (
                        <Choice key={opt} on={form.sex === opt} onClick={() => set({ sex: opt })} className="text-center">
                          {opt === "prefer_not_to_say" ? "Prefer not to say" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Choice>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {current.id === "type" && (
                <>
                  <div className="space-y-2">
                    {SKIN_TYPES.map((type) => (
                      <Choice key={type} on={form.skinType === type} onClick={() => set({ skinType: type })} icon={SKIN_TYPE_INFO[type].icon} hint={SKIN_TYPE_INFO[type].hint}>
                        <span className="capitalize">{type}</span>
                      </Choice>
                    ))}
                  </div>
                  <Field label="How often do products sting, redden or irritate your skin?">
                    <div className="grid grid-cols-3 gap-2">
                      {SENSITIVITY_OPTIONS.map((o) => (
                        <Choice key={o.value} on={form.sensitivity === o.value} onClick={() => set({ sensitivity: o.value })} className="text-center">
                          {o.label}
                        </Choice>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {current.id === "sun" && (
                <div className="space-y-2">
                  {SUN_REACTIONS.map((o) => (
                    <Choice key={o.value} on={form.phototype === o.value} onClick={() => set({ phototype: o.value })} icon={Sun}>
                      {o.label}
                    </Choice>
                  ))}
                  <p className="text-xs text-muted pt-1">After an hour of unprotected midday sun. This is the Fitzpatrick scale dermatologists use.</p>
                </div>
              )}

              {current.id === "concerns" && (
                <div className="space-y-2">
                  {CONCERN_KEYS.map((key) => {
                    const rank = form.concerns.indexOf(key);
                    const on = rank >= 0;
                    const full = !on && form.concerns.length >= MAX_CONCERNS;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleConcern(key)}
                        aria-pressed={on}
                        disabled={full}
                        className={`${tile(on)} disabled:opacity-40`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold ${on ? "bg-accent text-white" : "bg-blush text-accent"}`}>
                            {on ? rank + 1 : <Sparkles size={16} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block">{CONCERNS[key].label}</span>
                            <span className="block text-xs font-normal text-muted mt-0.5">{CONCERNS[key].blurb}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {current.id === "rate" && (
                <div className="space-y-5">
                  {form.concerns.map((key) => (
                    <fieldset key={key}>
                      <legend className="text-sm font-semibold text-primary mb-2">{CONCERNS[key].label}</legend>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const on = form.ratings[key] === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => set({ ratings: { ...form.ratings, [key]: n } })}
                              aria-pressed={on}
                              className={`rounded-xl border px-1 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                on ? `${RATING_TONES[n]} scale-[1.04] shadow-sm font-semibold` : "bg-white border-line text-muted hover:border-accent/50"
                              }`}
                            >
                              <span className="block text-base tabular-nums">{n}</span>
                              <span className="block text-[10px] leading-tight mt-0.5">{RATING_LABELS[n]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}

              {current.id === "routine" && (
                <div className="grid grid-cols-2 gap-2">
                  {CURRENT_PRODUCTS.map((o) => (
                    <Choice key={o.value} on={form.currentProducts.includes(o.value)} onClick={() => toggleProduct(o.value)}>
                      {o.label}
                    </Choice>
                  ))}
                  <p className="col-span-2 text-xs text-muted pt-1">Pick everything you use at least weekly. Nothing is fine too.</p>
                </div>
              )}

              {current.id === "life" && (
                <>
                  <Field label="How much do you sleep?">
                    <div className="grid grid-cols-3 gap-2">
                      {SLEEP_OPTIONS.map((o) => <Choice key={o.value} on={form.sleep === o.value} onClick={() => set({ sleep: o.value })} className="text-center">{o.label}</Choice>)}
                    </div>
                  </Field>
                  <Field label="Time in the sun">
                    <div className="grid grid-cols-3 gap-2">
                      {OUTDOOR_OPTIONS.map((o) => <Choice key={o.value} on={form.outdoor === o.value} onClick={() => set({ outdoor: o.value })} className="text-center">{o.label}</Choice>)}
                    </div>
                  </Field>
                  <Field label="Stress level">
                    <div className="grid grid-cols-3 gap-2">
                      {STRESS_OPTIONS.map((o) => <Choice key={o.value} on={form.stress === o.value} onClick={() => set({ stress: o.value })} className="text-center">{o.label}</Choice>)}
                    </div>
                  </Field>
                  <Field label="Do you smoke or vape?">
                    <div className="grid grid-cols-2 gap-2">
                      <Choice on={form.smoker === false} onClick={() => set({ smoker: false })} icon={Moon} className="text-center">No</Choice>
                      <Choice on={form.smoker === true} onClick={() => set({ smoker: true })} icon={Cigarette} className="text-center">Yes</Choice>
                    </div>
                  </Field>
                </>
              )}

              {current.id === "safety" && (
                <>
                  {!male && (
                    <Field label="Are you pregnant, breastfeeding or trying to conceive?">
                      <div className="space-y-2">
                        {PREGNANCY_OPTIONS.map((o) => <Choice key={o.value} on={form.pregnancy === o.value} onClick={() => set({ pregnancy: o.value })} icon={o.value === "yes" ? Baby : undefined}>{o.label}</Choice>)}
                      </div>
                      <p className="text-xs text-muted mt-2 flex items-start gap-1.5">
                        <ShieldCheck size={13} className="shrink-0 mt-0.5 text-accent" />
                        Some ingredients (like retinoids) are not recommended then. If you skip this, we keep the plan to the gentlest, safest options.
                      </p>
                    </Field>
                  )}
                  <Field label="How much time do you want to spend?">
                    <div className="space-y-2">
                      {ROUTINE_TIME_OPTIONS.map((o) => <Choice key={o.value} on={form.routineTime === o.value} onClick={() => set({ routineTime: o.value })} hint={o.hint}>{o.label}</Choice>)}
                    </div>
                  </Field>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={next}
              disabled={loading}
              className="tk-pill-btn tk-btn-primary w-full mt-6 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : last ? "Build my plan" : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
