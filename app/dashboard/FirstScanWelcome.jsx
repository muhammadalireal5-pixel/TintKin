import Link from "next/link";
import { Camera, ScanFace, Sparkles, ListChecks } from "lucide-react";

const STEPS = [
  { icon: Camera, title: "Take a selfie", text: "Soft daylight, relaxed face, no filters." },
  { icon: Sparkles, title: "Get your score", text: "Wrinkles, firmness, spots and radiance, read in seconds." },
  { icon: ListChecks, title: "Follow your plan", text: "A morning and evening routine made for your skin." },
];

/**
 * What a brand-new user sees on Today before their first scan: no empty
 * charts, just one clear next step. Kin (the companion) adds its own prompt
 * on top of this, and anchors itself to the card via data-tour="score".
 */
export default function FirstScanWelcome({ firstName }) {
  return (
    <div className="tk-container pt-1 sm:pt-4 pb-10">
      <header className="mb-5">
        <p className="text-[15px] text-muted">Welcome to TintKin,</p>
        <h1 className="text-[2rem] sm:text-4xl font-semibold text-primary leading-tight truncate">
          {firstName || "beautiful"}
        </h1>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 items-start">
        <section data-tour="score" className="tk-card p-6 sm:p-8 text-center lg:text-left">
          <span className="tk-icon-circle w-16 h-16 mx-auto lg:mx-0"><ScanFace size={32} strokeWidth={1.5} /></span>
          <h2 className="mt-5 text-2xl sm:text-3xl font-semibold text-primary">Your skin story starts with one selfie</h2>
          <p className="mt-2 text-muted max-w-md mx-auto lg:mx-0">
            Take your first scan and this page fills up with your score, your focus for the day and a routine made for you.
          </p>
          <Link href="/capture" className="tk-pill-btn tk-btn-primary mt-6 w-full sm:w-auto sm:px-8 py-3.5 text-base">
            <Camera size={18} /> Take my first scan
          </Link>
        </section>

        <ol className="flex flex-col gap-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="tk-tile flex items-center gap-4 p-4">
              <span className="tk-icon-circle w-11 h-11 shrink-0"><Icon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-primary">{i + 1}. {title}</span>
                <span className="block text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
