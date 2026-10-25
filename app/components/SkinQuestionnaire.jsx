"use client";

import { useState } from "react";
import {
  Check, Loader2, ArrowLeft, ArrowRight, ShieldCheck,
  Droplets, Wind, Sparkles, Layers, Flame, Moon, Cigarette, Baby,
} from "lucide-react";
import KinAvatar from "@/app/components/companion/KinAvatar";
import Typewriter from "@/app/components/companion/Typewriter";
import DurationPicker from "@/app/components/DurationPicker";
import {
  SKIN_TYPES, SEX_OPTIONS, CONCERNS, CONCERN_KEYS, MAX_CONCERNS, RATING_LABELS,
  SENSITIVITY_OPTIONS, SUN_REACTIONS, CURRENT_PRODUCTS, SLEEP_OPTIONS, OUTDOOR_OPTIONS,
  STRESS_OPTIONS, ROUTINE_TIME_OPTIONS,
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
  "bg-danger-soft text-danger border-danger/40 ring-danger/40",
  "bg-accent-soft text-accent-deep border-accent/40 ring-accent/40",
  "bg-blush text-primary border-line ring-primary/20",
  "bg-success-soft text-success border-success/40 ring-success/40",
  "bg-success text-white border-success ring-success",
];

const STEPS = [
  { id: "about", title: "About you", sub: "Age and sex change which ingredients are right for you." },
  { id: "type", title: "Your skin type", sub: "How your skin behaves on a normal day." },
  { id: "sensitivity", title: "How reactive is your skin?", sub: "How often products sting, redden or irritate it." },
  { id: "sun", title: "How does your skin react to sun?", sub: "This sets how strongly we protect it, and how gently we treat marks." },
  { id: "concerns", title: "What do you want to improve?", sub: `Pick up to ${MAX_CONCERNS}. Tap your most important one first.` },
  { id: "rate", title: "How are they right now?", sub: "Be honest, this is your starting point. We measure change against it." },
  { id: "routine", title: "What do you already use?", sub: "So we build on your routine instead of doubling up." },
  { id: "life", title: "Your daily life", sub: "Sleep, sun and stress all show up on skin." },
  { id: "safety", title: "Last two things", sub: "Safety first, then how much time you have." },
  { id: "length", title: "How long shall we work on your skin?", sub: "Each month we review your progress and suggest changes. You decide." },
];

// Kin writes down what you tell it: one short line per answer, so the form
// reads like a conversation. The strip is fixed height (two lines), so keep
// every line under ~70 characters.
const KIN_INTRO = {
  about: "Hi, I'm Kin! I'll write down everything you tell me.",
  type: "Pick the one that sounds most like you.",
  sensitivity: "This decides how gently I bring in new things.",
  sun: "Think of an hour in midday sun, no sunscreen.",
  concerns: "Tap your biggest one first. I'll number them.",
  rate: "No judging. Honest answers make a better plan.",
  routine: "Skip anything you don't use at least weekly.",
  life: "Small habits, big effect on skin.",
  safety: "Nearly done! Just a couple of safety questions.",
  length: "Skin takes time. I'll check in with you every month.",
};
const KIN_MONTHS = {
  1: "One month: a good first step.",
  3: "Three months. Time to really see change!",
  5: "Five months. I like your commitment.",
  7: "Seven months. Let's do this properly.",
};
const kinMonths = (n) => KIN_MONTHS[n] || `${n} months. Noted, I'll be with you all the way.`;
const KIN_SKIN_TYPE = {
  oily: "Oily, noted. We'll balance shine without stripping.",
  dry: "Dry, writing that down. Comfort comes first.",
  combination: "Combination: oily T-zone, thirsty cheeks. Very common!",
  normal: "Lucky you. We'll keep things balanced.",
  sensitive: "Sensitive, noted. I'll go slow and gentle.",
};
const KIN_SENSITIVITY = {
  low: "Tough skin! I can be a bit bolder.",
  medium: "Sometimes. New things will arrive one at a time.",
  high: "Writing that down in capital letters. We go gentle.",
};
const KIN_RATING = [
  "",
  "Thanks for being honest. That's your starting line.",
  "Understood. There's room to move, and that's good.",
  "Okay is a fine place to start from.",
  "Good! We'll protect that and push further.",
  "Great already. We'll keep it that way.",
];
const KIN_SLEEP = { under6: "Under 6 hours. I'll keep steps calming and simple.", "6to7": "Nearly there. Writing it down.", "7plus": "Great sleep. Your skin loves that." };
const KIN_OUTDOOR = { indoors: "Mostly indoors. Daylight through windows still counts!", some: "Some sun. SPF becomes a daily habit.", lots: "Lots of sun. Sunscreen will be your hero." };
const KIN_STRESS = { low: "Calm. Love that for you.", medium: "A little stress is very normal. Noted.", high: "High stress shows on skin. I'll keep it simple." };
const KIN_SMOKER = { false: "Noted, thank you.", true: "Thanks for telling me. I'll factor that in." };
const KIN_PREGNANCY = {
  no: "Noted, thank you.",
  yes: "Thank you. Every step will be pregnancy-safe.",
  prefer_not: "No problem. I'll stick to the gentlest options.",
};
const KIN_TIME = { quick: "Quick it is. Few steps, real results.", moderate: "Balanced, perfect. About five minutes.", full: "A full routine, my favourite kind." };

const phototypeLine = (n) =>
  n <= 2 ? "Burns easily. SPF will be your best friend."
    : n <= 4 ? "Balanced, noted. Daily SPF still matters."
      : "Deeper tones mark easily, so I'll go gentle with acids.";

// Short labels for the pregnancy question so all three fit on one row.
const PREGNANCY_SHORT = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "prefer_not", label: "Prefer not to say" },
];

// Selection is shown with colour, a ring and a small tick overlaid in the
// corner (no border-width change, nothing added to the flow), so a tile never
// changes size when it is tapped.
const tile = (on) =>
  `relative w-full text-left rounded-2xl border px-3 py-2 min-h-[2.75rem] text-[13px] leading-snug font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
    on ? "bg-accent-soft border-accent text-accent-deep ring-1 ring-accent" : "bg-white border-line text-primary hover:border-accent/50"
  }`;

const Tick = () => (
  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center" aria-hidden="true">
    <Check size={10} strokeWidth={3.5} />
  </span>
);

function Choice({ on, onClick, children, hint, icon: Icon, center = false, className = "" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`${tile(on)} flex items-center ${className}`}>
      <span className={`flex w-full items-center gap-2.5 ${center ? "justify-center text-center" : ""}`}>
        {Icon && (
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${on ? "bg-accent text-white" : "bg-blush text-accent"}`}>
            <Icon size={16} />
          </span>
        )}
        <span className={`min-w-0 ${center ? "" : "flex-1"}`}>
          <span className="block">{children}</span>
          {hint && <span className="block text-xs font-normal text-muted mt-px">{hint}</span>}
        </span>
      </span>
      {on && <Tick />}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-primary mb-1.5">{label}</p>
      {children}
    </div>
  );
}

/** Blank answers: what a new account starts from. */
export const EMPTY_SKIN_FORM = {
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
  planMonths: 0, // months to work on their skin; 0 = not chosen yet
};

/**
 * The skin questionnaire, shared by onboarding (blank) and "update my skin
 * profile" (prefilled). `onSubmit` gets the validated payload and returns
 * `{ success, error }`; the caller decides what happens next. `fit` sizes the
 * card to the screen (focused onboarding shell, no nav) so no step scrolls.
 */
export default function SkinQuestionnaire({ initial = EMPTY_SKIN_FORM, onSubmit, finalLabel = "Build my plan", fit = false }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [kin, setKin] = useState({ text: KIN_INTRO.about, nudge: 0 });

  const [form, setForm] = useState({ ...EMPTY_SKIN_FORM, ...initial });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const male = form.sex === "male";

  const say = (text) => {
    if (text) setKin((k) => ({ text, nudge: k.nudge + 1 }));
  };
  // Pick an answer and let Kin react to it.
  const pick = (patch, line) => {
    set(patch);
    say(line);
  };

  const toggleConcern = (key) => {
    const label = CONCERNS[key].label;
    if (form.concerns.includes(key)) {
      set({ concerns: form.concerns.filter((k) => k !== key) });
      say(`Taking ${label.toLowerCase()} off the list.`);
      return;
    }
    if (form.concerns.length >= MAX_CONCERNS) return;
    const n = form.concerns.length + 1;
    set({ concerns: [...form.concerns, key] });
    say(n === 1 ? `${label} first. Writing that down.` : n === MAX_CONCERNS ? `${label} too. Three is plenty to focus on.` : `${label}, number ${n}. Noted.`);
  };
  const toggleProduct = (o) => {
    const has = form.currentProducts.includes(o.value);
    set({ currentProducts: has ? form.currentProducts.filter((p) => p !== o.value) : [...form.currentProducts, o.value] });
    say(has ? `Okay, no ${o.label.toLowerCase()}.` : `${o.label}: I'll build on it, not double up.`);
  };

  const missing = (id) => {
    switch (id) {
      case "about": return !form.birthDate || !form.sex ? "Please add your date of birth and sex to continue." : "";
      case "type": return !form.skinType ? "Please pick your skin type." : "";
      case "sensitivity": return !form.sensitivity ? "Please pick how reactive your skin is." : "";
      case "sun": return !form.phototype ? "Please pick the closest match." : "";
      case "concerns": return form.concerns.length === 0 ? "Please pick at least one concern." : "";
      case "rate": return form.concerns.some((k) => !form.ratings[k]) ? "Please rate each concern." : "";
      case "life": return !form.sleep || !form.outdoor || !form.stress || form.smoker === null ? "Please answer each question." : "";
      case "safety": return (!male && !form.pregnancy) || !form.routineTime ? "Please answer both to build a safe plan." : "";
      case "length": return !form.planMonths ? "Please pick how long you'd like to work on your skin." : "";
      default: return "";
    }
  };

  const goTo = (n) => {
    setStep(n);
    say(KIN_INTRO[STEPS[n].id]);
  };

  const next = async () => {
    const problem = missing(STEPS[step].id);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    if (step < STEPS.length - 1) {
      goTo(step + 1);
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
      planMonths: form.planMonths,
    };
    const validation = validateOnboarding(payload);
    if (!validation.isValid) {
      setError(validation.error || "Please check your answers.");
      return;
    }
    setLoading(true);
    try {
      const res = await onSubmit(payload);
      // On success the caller navigates away, so the button stays busy.
      if (!res?.success) {
        setError(res?.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong, please try again later");
      setLoading(false);
    }
  };

  const back = () => {
    setError("");
    goTo(Math.max(0, step - 1));
  };

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className={`flex-1 flex items-center justify-center px-4 ${fit ? "py-2" : "py-4 sm:py-8"}`}>
      <div className="w-full max-w-md">
        <div
          className={`tk-card overflow-hidden tk-anim-1 flex flex-col ${
            fit ? "h-[calc(100dvh-5rem)] max-h-[42rem] min-h-[29rem]" : "h-[40rem] max-h-[calc(100dvh-9rem)] min-h-[29rem]"
          }`}
        >
          <div className="shrink-0 bg-gradient-to-br from-accent-soft via-blush to-surface px-5 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between mb-2 h-5">
              <p className="tk-eyebrow">Step {step + 1} of {STEPS.length}</p>
              {step > 0 && (
                <button type="button" onClick={back} disabled={loading} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary disabled:opacity-50">
                  <ArrowLeft size={13} /> Back
                </button>
              )}
            </div>
            <div className="flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
              {STEPS.map((s, i) => (
                <span key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-white/70"}`} />
              ))}
            </div>
            <h1 key={current.id} className="text-[1.3rem] sm:text-2xl font-semibold text-primary leading-tight mt-3 tk-anim-2">{current.title}</h1>
            <p className="text-[13px] text-muted leading-snug mt-1 min-h-[2.3rem]">{current.sub}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-3">
            <div key={current.id} className="space-y-3 tk-anim-2">
              {current.id === "about" && (
                <>
                  <Field label="Date of birth">
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => pick({ birthDate: e.target.value }, e.target.value ? "Noted. Skin needs change with age, so this helps." : "")}
                      className="tk-input"
                    />
                  </Field>
                  <Field label="Sex">
                    <div className="grid grid-cols-2 gap-2">
                      {SEX_OPTIONS.map((opt) => (
                        <Choice key={opt} on={form.sex === opt} onClick={() => pick({ sex: opt }, "Got it. That helps me pick the right ingredients.")} center>
                          {opt === "prefer_not_to_say" ? "Prefer not to say" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Choice>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {current.id === "type" && (
                <div className="space-y-2">
                  {SKIN_TYPES.map((type) => (
                    <Choice key={type} on={form.skinType === type} onClick={() => pick({ skinType: type }, KIN_SKIN_TYPE[type])} icon={SKIN_TYPE_INFO[type].icon} hint={SKIN_TYPE_INFO[type].hint}>
                      <span className="capitalize">{type}</span>
                    </Choice>
                  ))}
                </div>
              )}

              {current.id === "sensitivity" && (
                <div className="space-y-2.5">
                  {SENSITIVITY_OPTIONS.map((o) => (
                    <Choice key={o.value} on={form.sensitivity === o.value} onClick={() => pick({ sensitivity: o.value }, KIN_SENSITIVITY[o.value])} className="py-3.5">
                      <span className="text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs font-normal text-muted mt-0.5">{o.hint}</span>
                    </Choice>
                  ))}
                </div>
              )}

              {current.id === "sun" && (
                <div className="space-y-2">
                  {SUN_REACTIONS.map((o) => (
                    <Choice key={o.value} on={form.phototype === o.value} onClick={() => pick({ phototype: o.value }, phototypeLine(o.value))}>
                      {o.label}
                    </Choice>
                  ))}
                  <p className="text-xs text-muted pt-0.5">This is the Fitzpatrick scale dermatologists use.</p>
                </div>
              )}

              {current.id === "concerns" && (
                <div className="grid grid-cols-2 gap-2">
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
                        className={`${tile(on)} h-[4.1rem] disabled:opacity-40`}
                      >
                        <span className="block pr-5">{CONCERNS[key].label}</span>
                        <span className="block text-xs font-normal text-muted mt-px leading-tight line-clamp-2">{CONCERNS[key].blurb}</span>
                        {on && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center" aria-label={`Priority ${rank + 1}`}>
                            {rank + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {current.id === "rate" && (
                <div className="space-y-3.5">
                  {form.concerns.map((key) => (
                    <fieldset key={key}>
                      <legend className="text-sm font-semibold text-primary mb-1.5">{CONCERNS[key].label}</legend>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const on = form.ratings[key] === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => pick({ ratings: { ...form.ratings, [key]: n } }, KIN_RATING[n])}
                              aria-pressed={on}
                              className={`rounded-xl border px-0.5 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                on ? `${RATING_TONES[n]} ring-1 font-semibold` : "bg-white border-line text-muted hover:border-accent/50"
                              }`}
                            >
                              <span className="block text-base tabular-nums leading-none">{n}</span>
                              <span className="block text-[10px] leading-tight mt-1">{RATING_LABELS[n]}</span>
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
                    <Choice key={o.value} on={form.currentProducts.includes(o.value)} onClick={() => toggleProduct(o)} className="min-h-[3.25rem]">
                      {o.label}
                    </Choice>
                  ))}
                  <p className="col-span-2 text-xs text-muted pt-0.5">Pick everything you use at least weekly. Nothing is fine too.</p>
                </div>
              )}

              {current.id === "life" && (
                <>
                  <Field label="How much do you sleep?">
                    <div className="grid grid-cols-3 gap-2">
                      {SLEEP_OPTIONS.map((o) => <Choice key={o.value} on={form.sleep === o.value} onClick={() => pick({ sleep: o.value }, KIN_SLEEP[o.value])} center>{o.label}</Choice>)}
                    </div>
                  </Field>
                  <Field label="Time in the sun">
                    <div className="grid grid-cols-3 gap-2">
                      {OUTDOOR_OPTIONS.map((o) => <Choice key={o.value} on={form.outdoor === o.value} onClick={() => pick({ outdoor: o.value }, KIN_OUTDOOR[o.value])} center>{o.label}</Choice>)}
                    </div>
                  </Field>
                  <Field label="Stress level">
                    <div className="grid grid-cols-3 gap-2">
                      {STRESS_OPTIONS.map((o) => <Choice key={o.value} on={form.stress === o.value} onClick={() => pick({ stress: o.value }, KIN_STRESS[o.value])} center>{o.label}</Choice>)}
                    </div>
                  </Field>
                  <Field label="Do you smoke or vape?">
                    <div className="grid grid-cols-2 gap-2">
                      <Choice on={form.smoker === false} onClick={() => pick({ smoker: false }, KIN_SMOKER.false)} icon={Moon} center>No</Choice>
                      <Choice on={form.smoker === true} onClick={() => pick({ smoker: true }, KIN_SMOKER.true)} icon={Cigarette} center>Yes</Choice>
                    </div>
                  </Field>
                </>
              )}

              {current.id === "safety" && (
                <>
                  {!male && (
                    <Field label="Pregnant, breastfeeding or trying to conceive?">
                      <div className="grid grid-cols-3 gap-2">
                        {PREGNANCY_SHORT.map((o) => (
                          <Choice key={o.value} on={form.pregnancy === o.value} onClick={() => pick({ pregnancy: o.value }, KIN_PREGNANCY[o.value])} icon={o.value === "yes" ? Baby : undefined} center>
                            {o.label}
                          </Choice>
                        ))}
                      </div>
                      <p className="text-xs text-muted mt-1.5 flex items-start gap-1.5">
                        <ShieldCheck size={13} className="shrink-0 mt-0.5 text-accent" />
                        Some ingredients (like retinoids) aren&apos;t advised then. If you skip this, we keep to the gentlest options.
                      </p>
                    </Field>
                  )}
                  <Field label="How much time do you want to spend?">
                    <div className="space-y-2">
                      {ROUTINE_TIME_OPTIONS.map((o) => (
                        <Choice key={o.value} on={form.routineTime === o.value} onClick={() => pick({ routineTime: o.value }, KIN_TIME[o.value])} hint={o.hint}>
                          {o.label}
                        </Choice>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {current.id === "length" && (
                <>
                  <DurationPicker value={form.planMonths} onChange={(n) => pick({ planMonths: n }, kinMonths(n))} compact />
                  <p className="text-xs text-muted">You can change this any time from your plan.</p>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 px-5 sm:px-6 pt-2.5 pb-4 border-t border-line/70 bg-surface">
            {/* Kin: always visible, fixed height, so the form never jumps. */}
            <div className="flex items-center gap-2.5 h-[3.1rem]">
              <KinAvatar size={44} nudge={kin.nudge} />
              {error ? (
                <p role="alert" className="flex-1 h-full rounded-2xl rounded-bl-sm bg-danger-soft border border-danger/20 text-danger px-3 flex items-center text-[13px] leading-snug font-medium">
                  {error}
                </p>
              ) : (
                <div aria-live="polite" className="flex-1 h-full rounded-2xl rounded-bl-sm bg-accent-soft/80 border border-accent/15 px-3 flex items-center text-[13px] leading-snug text-primary overflow-hidden">
                  <Typewriter key={kin.text} text={kin.text} className="line-clamp-2" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={next}
              disabled={loading}
              className="tk-pill-btn tk-btn-primary w-full mt-2.5 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : last ? finalLabel : <>Continue <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
