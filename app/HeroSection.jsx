import Link from "next/link";
import {
  ScanFace,
  FlaskConical,
  CalendarCheck,
  FileText,
  Trophy,
  Sun,
  Moon,
  Apple,
  Droplets,
  Check,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  { icon: ScanFace, title: "AI skin scan", desc: "Snap a quick selfie and get a clear score for wrinkles, firmness, spots and radiance." },
  { icon: FlaskConical, title: "What-If simulator", desc: "Curious about a new routine? Preview how different choices could look and feel." },
  { icon: CalendarCheck, title: "Daily routine", desc: "A gentle morning and evening plan that adapts to your skin and keeps you on a streak." },
  { icon: FileText, title: "Reports", desc: "Beautiful, easy-to-read summaries that show what is improving over time." },
  { icon: Trophy, title: "Leaderboard", desc: "Friendly competition and trophies to keep your habits fun and consistent." },
];

const STEPS = [
  { n: "1", title: "Scan", desc: "Take a filter-free selfie in natural light." },
  { n: "2", title: "Understand", desc: "See your skin score and what is behind it." },
  { n: "3", title: "Improve", desc: "Follow a daily plan and watch your progress grow." },
];

const METRICS = [
  { label: "Wrinkles", value: 12, up: true },
  { label: "Firmness", value: 28, up: true },
  { label: "Spots", value: 15, up: false },
  { label: "Radiance", value: 82, up: true },
];

const PLAN = [
  { label: "Morning Routine", icon: Sun },
  { label: "Evening Routine", icon: Moon },
  { label: "Nutrition", icon: Apple },
  { label: "Hydration", icon: Droplets },
];

export function HeroSection() {
  return (
    <div className="flex flex-col flex-1 selection:bg-accent-soft">
      {/* Hero */}
      <section className="tk-page relative overflow-hidden">
        <div className="tk-container grid lg:grid-cols-2 items-center gap-10 lg:gap-14 py-10 sm:py-14 lg:py-20">
          <div className="text-center lg:text-left">
            <p className="tk-anim-1 tk-chip mb-5 mx-auto lg:mx-0 w-fit">A gentle approach to skin health</p>

            <h1 className="tk-anim-2 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight text-primary mb-4 lg:mb-6">
              A daily journal for your <span className="text-accent">skin&rsquo;s</span> journey.
            </h1>

            <p className="tk-anim-3 text-base sm:text-lg text-muted leading-relaxed max-w-xl mb-8 mx-auto lg:mx-0">
              Move away from harsh clinical metrics. Discover a mindful, AI-supported companion that helps you understand, nurture, and celebrate your skin every day.
            </p>

            <div className="tk-anim-4 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Link href="/sign-up" className="tk-pill-btn tk-btn-primary gap-2 w-full sm:w-auto">
                Get started
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
          <h2 id="features-title" className="text-3xl sm:text-4xl font-semibold text-primary mb-3">A gentle perspective on care</h2>
          <p className="text-muted leading-relaxed">Embrace a routine that listens to your skin&apos;s unique needs, backed by thoughtful intelligence.</p>
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
          <h2 className="text-3xl sm:text-4xl font-semibold text-primary mb-3">Start with a free scan</h2>
          <p className="text-muted max-w-xl mx-auto mb-6">
            Create your account in seconds, see your first skin score, then pick the plan or credit pack that suits you. No pressure, cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up" className="tk-pill-btn tk-btn-primary w-full sm:w-auto">Get started</Link>
            <Link href="/pricing" className="tk-pill-btn tk-btn-ghost w-full sm:w-auto bg-white">See pricing</Link>
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
        <p className="text-xl font-semibold text-primary mb-3">Your skin today</p>

        <div className="tk-card p-4 mb-3">
          <p className="tk-eyebrow mb-1">Skin score</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-semibold text-primary leading-none">72</span>
            <span className="text-sm text-muted mb-1">/ 100</span>
            <span className="tk-chip tk-chip-success ml-auto mb-1">+8</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden">
            <div className="h-full w-[72%] rounded-full bg-accent" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {METRICS.map((m) => (
            <div key={m.label} className="tk-tile p-2 text-center">
              <p className="text-[9px] text-muted truncate">{m.label}</p>
              <p className="text-base font-semibold text-primary leading-tight">{m.value}</p>
              <p className={`text-[9px] font-semibold ${m.up ? "text-success" : "text-muted"}`}>{m.up ? "▲" : "–"}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-primary">Today&rsquo;s Plan</p>
          <p className="text-[10px] text-muted">2 of 12 completed</p>
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
