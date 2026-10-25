import Link from "next/link";
import {
  ScanFace,
  FlaskConical,
  CalendarCheck,
  FileText,
  Trophy,
  Sun,
  Moon,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  { icon: CalendarCheck, title: "A personal 30-day plan", desc: "Built from your selfie and your goals, with a clear target for the two areas that matter most to your skin." },
  { icon: Sun, title: "A routine you will follow", desc: "Simple morning and evening steps, each with a reason it is right for you. New steps arrive as you go." },
  { icon: ScanFace, title: "Weekly check-ins", desc: "One scan a week shows how far you have come. Your plan adapts to what is working." },
  { icon: FlaskConical, title: "What-If simulator", desc: "Curious about a new product? Preview how it could change your skin before you buy." },
  { icon: FileText, title: "Progress reports", desc: "Easy-to-read summaries that show what is improving and what to focus on next." },
  { icon: Trophy, title: "Kin, streaks and trophies", desc: "Your friendly companion keeps you going with gentle reminders and small wins along the way." },
];

const STEPS = [
  { n: "1", title: "Scan once", desc: "Take a filter-free selfie. That is your starting point." },
  { n: "2", title: "Follow your plan", desc: "A simple daily routine, built around your skin and goals." },
  { n: "3", title: "See it improve", desc: "Weekly check-ins show your progress, and your plan keeps adapting." },
];

const FOCUS = [
  { label: "Radiance", from: 48, now: 53, aim: 56, pct: 62 },
  { label: "Even tone", from: 55, now: 57, aim: 60, pct: 40 },
];

const PLAN = [
  { label: "Morning Routine", icon: Sun },
  { label: "Evening Routine", icon: Moon },
  { label: "New this week", icon: Sparkles },
  { label: "Check-in", icon: ScanFace },
];

export function HeroSection() {
  return (
    <div className="flex flex-col flex-1 selection:bg-accent-soft">
      {/* Hero */}
      <section className="tk-page relative overflow-hidden">
        <div className="tk-container grid lg:grid-cols-2 items-center gap-10 lg:gap-14 py-10 sm:py-14 lg:py-20">
          <div className="text-center lg:text-left">
            <p className="tk-anim-1 tk-chip mb-5 mx-auto lg:mx-0 w-fit">Your 30-day skin plan</p>

            <h1 className="tk-anim-2 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-primary mb-4 lg:mb-6">
              Improve your <span className="text-accent">skin</span> in 30 days.
            </h1>

            <p className="tk-anim-3 text-base sm:text-lg text-muted leading-relaxed max-w-xl mb-8 mx-auto lg:mx-0">
              One selfie builds a personal plan. Follow a simple daily routine with Kin by your side, check in weekly, and watch your progress show.
            </p>

            <div className="tk-anim-4 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Link href="/sign-up" className="tk-pill-btn tk-btn-primary gap-2 w-full sm:w-auto">
                Build my free plan
                <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
              </Link>
              <Link href="/sign-in" className="tk-pill-btn tk-btn-ghost w-full sm:w-auto">
                I already have an account
              </Link>
            </div>
          </div>

          <PhonePreview />
        </div>
      </section>

      {/* Features */}
      <section className="tk-container py-12 sm:py-16" aria-labelledby="features-title">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2 id="features-title" className="text-3xl sm:text-4xl font-semibold text-primary mb-3">Not just a score. A plan that works</h2>
          <p className="text-muted leading-relaxed">Everything you need to actually improve your skin, and proof that it is working.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="tk-card p-5 sm:p-6">
              <span className="tk-icon-circle w-12 h-12 mb-4"><Icon className="w-6 h-6" aria-hidden="true" /></span>
              <h3 className="text-lg font-semibold text-primary mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-blush/60 border-y border-line" aria-labelledby="how-title">
        <div className="tk-container py-12 sm:py-16">
          <h2 id="how-title" className="text-3xl sm:text-4xl font-semibold text-primary text-center mb-8 sm:mb-10">How it works</h2>
          <ol className="grid md:grid-cols-3 gap-3 sm:gap-4">
            {STEPS.map((s) => (
              <li key={s.n} className="tk-card p-5 sm:p-6 flex md:flex-col items-center md:items-start gap-4 md:gap-3">
                <span className="w-11 h-11 shrink-0 rounded-full bg-accent text-white font-semibold flex items-center justify-center">{s.n}</span>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{s.title}</h3>
                  <p className="text-sm text-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing teaser / final CTA */}
      <section className="tk-container py-12 sm:py-16">
        <div className="tk-card p-8 sm:p-12 text-center bg-accent-soft">
          <h2 className="text-3xl sm:text-4xl font-semibold text-primary mb-3">Start with your free plan</h2>
          <p className="text-muted max-w-xl mx-auto mb-6">
            Create your account, take one selfie and get your personal 30-day plan. Free includes your plan and 2 scans a month. Upgrade from $8 a month for more check-ins. Cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up" className="tk-pill-btn tk-btn-primary w-full sm:w-auto">Build my free plan</Link>
            <Link href="/pricing" className="tk-pill-btn tk-btn-ghost w-full sm:w-auto bg-paper">See pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** CSS-built mock of the app's "Today" screen. Purely decorative. */
function PhonePreview() {
  return (
    <div className="tk-anim-5 flex justify-center" aria-hidden="true">
      <div className="w-full max-w-[300px] sm:max-w-[330px] rounded-[2.5rem] border-[6px] border-cocoa bg-base p-4 shadow-[0_30px_60px_-20px_rgb(var(--tk-ink-rgb)/0.45)]">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-cocoa/20" />
        <p className="text-xs text-muted">Good morning,</p>
        <p className="text-xl font-semibold text-primary mb-3">Your skin plan</p>

        <div className="tk-card p-4 mb-3">
          <div className="flex items-center justify-between">
            <p className="tk-eyebrow">Day 9 of 30</p>
            <span className="tk-chip">Target</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
            <div className="h-full w-[30%] rounded-full bg-accent" />
          </div>
          <ul className="mt-3 space-y-2.5">
            {FOCUS.map((f) => (
              <li key={f.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-primary">{f.label}</span>
                  <span className="text-[10px] text-muted">{f.from} &rarr; <strong className="text-primary">{f.now}</strong> &middot; aim {f.aim}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${f.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-primary">Today&rsquo;s Plan</p>
          <p className="tk-text-micro text-muted">2 of 6 completed</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {PLAN.map(({ label, icon: Icon }, i) => (
            <div key={label} className="tk-tile p-2 flex flex-col items-center gap-1 text-center relative">
              {i === 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </span>
              )}
              <Icon className="w-4 h-4 text-accent" />
              <span className="text-[8px] leading-tight text-primary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
