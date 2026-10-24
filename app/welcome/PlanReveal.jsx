"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Sun, Moon, ShieldCheck, Target, Leaf, ArrowRight, ScanFace, Sparkles, CalendarDays } from "lucide-react";
import { RATING_LABELS } from "@/lib/constants/profile";
import KinChat from "./KinChat";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

// One soft colour per focus area / week so the page reads as a set of distinct cards.
const TINTS = [
  { card: "from-accent-soft to-blush", dot: "bg-accent", ring: "ring-accent" },
  { card: "from-lavender/70 to-surface", dot: "bg-accent-deep", ring: "ring-accent-deep" },
  { card: "from-sage/50 to-surface", dot: "bg-success", ring: "ring-success" },
];

function Chip({ children, delay, tone = "bg-white" }) {
  return (
    <span className={`tk-float inline-flex items-center rounded-full ${tone} border border-white/70 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary shadow-sm`} style={{ "--d": `${delay}s` }}>
      {children}
    </span>
  );
}

function RatingTrack({ baseline, target, tint }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-1" role="img" aria-label={`From ${RATING_LABELS[baseline]} to ${RATING_LABELS[target]}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-2.5 flex-1 rounded-full ${n <= baseline ? tint.dot : "bg-white/80"} ${n === target ? `ring-2 ring-offset-1 ${tint.ring}` : ""}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{RATING_LABELS[baseline]} now</span>
        <span className="font-semibold text-primary">aim: {RATING_LABELS[target]}</span>
      </div>
    </div>
  );
}

function StepList({ title, icon: Icon, steps }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-primary mb-2"><Icon size={15} className="text-accent" /> {title}</p>
      <ul className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.id}>
            <details className="group rounded-xl bg-white/70 px-3 py-2">
              <summary className="cursor-pointer list-none text-sm text-primary leading-snug flex items-start justify-between gap-2">
                <span>{s.text}</span>
                {s.why && <span className="text-[10px] font-semibold uppercase tracking-wide text-accent shrink-0 mt-0.5 group-open:hidden">why</span>}
              </summary>
              {s.why && <p className="text-xs text-muted mt-1.5 leading-relaxed">{s.why}</p>}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function safetyLine(profile) {
  if (profile.pregnant) return "Every step is pregnancy-safe. No retinoids or strong acids.";
  if (profile.avoidUnsafe) return "You skipped the pregnancy question, so we kept to gentle, pregnancy-safe steps.";
  if (profile.sensitivity === "high") return "Your skin reacts easily, so there are no strong actives. Gentle ingredients only.";
  return "Week 1 has no actives. After that, one new step at a time, and never two strong actives together.";
}

export default function PlanReveal({ plan: initialPlan, profile, firstName }) {
  const [plan, setPlan] = useState(initialPlan);
  const [flash, setFlash] = useState(0);
  const [approved, setApproved] = useState(false);
  const cta = useRef(null);

  const onPlan = (next, changed) => {
    setPlan(next);
    if (changed) setFlash((f) => f + 1);
  };
  const onApprove = () => {
    setApproved(true);
    cta.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const phaseOf = (startDay) => plan.phases.find((p) => startDay >= p.startDay && startDay <= p.endDay);
  const weeks = [
    { key: "now", label: "Week 1 · Foundation", tag: "Today", steps: [...plan.steps.am, ...plan.steps.pm].map((s) => ({ ...s, icon: plan.steps.am.includes(s) ? Sun : Moon })) },
    ...plan.upcoming.map((g) => {
      const phase = phaseOf(g.startDay);
      return { key: g.startDay, label: `Day ${g.startDay} · ${phase?.name || "New"}`, tag: "Unlocks", steps: g.steps.map((s) => ({ ...s, icon: s.slot === "am" ? Sun : Moon })) };
    }),
  ];

  const suggestions = [
    "Keep it simpler",
    "Go gentler on my skin",
    profile.concerns[1] ? `Focus more on ${profile.concerns[1].label.toLowerCase()}` : "Add one more step",
  ];

  return (
    <div className="flex flex-col gap-4">
      <header className="tk-pop relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-accent-soft via-blush to-lavender/60 p-6 sm:p-8">
        <p className="tk-eyebrow flex items-center gap-1.5"><Sparkles size={13} /> Your plan is ready</p>
        <h1 className="text-[1.7rem] sm:text-3xl font-semibold text-primary leading-tight mt-1.5">
          {firstName ? `${firstName}, here are your next 30 days` : "Here are your next 30 days"}
        </h1>
        <p className="text-sm text-primary/80 mt-2 max-w-md leading-relaxed">{plan.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip delay={0.1} tone="bg-lavender/70"><span className="capitalize">{profile.skinType}</span>&nbsp;skin</Chip>
          <Chip delay={0.25}>Sun type {ROMAN[profile.phototype] || "III"}</Chip>
          <Chip delay={0.4} tone="bg-sage/50"><span className="capitalize">{profile.sensitivity}</span>&nbsp;sensitivity</Chip>
          <Chip delay={0.55} tone="bg-accent-soft">{profile.routineTime === "quick" ? "Quick routine" : profile.routineTime === "full" ? "Full routine" : "Balanced routine"}</Chip>
        </div>
      </header>

      <section aria-label="What we'll work on">
        <h2 className="text-[15px] font-semibold text-primary mb-2.5 flex items-center gap-2"><Target size={16} className="text-accent" /> What we&apos;ll work on</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {plan.progress.focus.map((f, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <div key={f.metric} className={`tk-float rounded-2xl bg-gradient-to-br ${tint.card} p-4 border border-white/70`} style={{ "--d": `${0.15 * i}s` }}>
                <p className="text-xs font-semibold text-muted">{i === 0 ? "Top priority" : `Priority ${i + 1}`}</p>
                <p className="text-lg font-semibold text-primary leading-tight">{f.label}</p>
                <RatingTrack baseline={f.baseline} target={f.target} tint={tint} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="tk-pop rounded-2xl bg-gradient-to-br from-sage/50 to-surface border border-white/70 p-4 flex items-start gap-3" style={{ "--d": "0.1s" }} aria-label="Safety">
        <span className="tk-icon-circle w-10 h-10 bg-white shrink-0"><ShieldCheck size={18} /></span>
        <div>
          <p className="text-sm font-semibold text-primary">Built to be safe for you</p>
          <p className="text-sm text-primary/80 leading-relaxed">{safetyLine(profile)}</p>
        </div>
      </section>

      <section key={flash} className={flash ? "tk-flash rounded-2xl" : ""} aria-label="Your routine">
        <h2 className="text-[15px] font-semibold text-primary mb-2.5 flex items-center gap-2"><CalendarDays size={16} className="text-accent" /> Your first day</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-accent-soft/70 to-surface border border-white/70 p-4"><StepList title="Morning" icon={Sun} steps={plan.steps.am} /></div>
          <div className="rounded-2xl bg-gradient-to-br from-lavender/60 to-surface border border-white/70 p-4"><StepList title="Evening" icon={Moon} steps={plan.steps.pm} /></div>
        </div>
      </section>

      <section aria-label="What's coming">
        <h2 className="text-[15px] font-semibold text-primary mb-2.5 flex items-center gap-2"><Leaf size={16} className="text-accent" /> One new step at a time</h2>
        <div className="flex gap-3 overflow-x-auto snap-x pb-2 -mx-1 px-1">
          {weeks.map((w, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <div key={w.key} className={`snap-start shrink-0 w-56 rounded-2xl bg-gradient-to-br ${tint.card} border border-white/70 p-4 tk-pop`} style={{ "--d": `${0.08 * i}s` }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{w.tag}</p>
                <p className="text-sm font-semibold text-primary mt-0.5">{w.label}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {w.steps.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-start gap-1.5 text-xs text-primary/90 leading-snug">
                      <s.icon size={12} className="mt-0.5 shrink-0 text-accent" />
                      <span className="line-clamp-2">{s.text}</span>
                    </li>
                  ))}
                  {w.steps.length > 3 && <li className="text-[11px] text-muted">+{w.steps.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <KinChat
        plan={plan}
        onPlan={onPlan}
        onApprove={onApprove}
        suggestions={suggestions}
        intro={`Here's the plan I built from your answers. Does it feel right to you? I can change anything: fewer steps, gentler products, or a different focus.`}
      />

      <div ref={cta} className={`rounded-2xl p-1 transition-shadow ${approved ? "ring-2 ring-accent shadow-lg" : ""}`}>
        <Link href="/routine" className="tk-pill-btn tk-btn-primary w-full py-3.5 text-base">
          Start my plan <ArrowRight size={18} />
        </Link>
      </div>

      <Link href="/capture" className="mx-auto inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary transition-colors">
        <ScanFace size={15} /> Want to measure your progress in numbers? Add a baseline scan (optional)
      </Link>
    </div>
  );
}
