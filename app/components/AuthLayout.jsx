import Wordmark from "@/app/components/ui/Wordmark";

const BENEFITS = [
  "A personal 30-day plan built from one selfie",
  "A daily routine that adapts as your skin changes",
  "What-If simulator to preview real results",
];

/**
 * Shared auth card: centred white card on phone, two-column split on desktop
 * (brand panel left, form right). Used by sign-in, sign-up and reset pages.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
      <div className="w-full max-w-md lg:max-w-4xl tk-card overflow-hidden lg:grid lg:grid-cols-2">
        <aside className="hidden lg:flex flex-col justify-between bg-accent-soft p-10">
          <Wordmark className="h-14" />
          <div>
            <h2 className="text-3xl font-semibold text-primary leading-tight mb-3">
              Your skin, understood.
            </h2>
            <p className="text-muted mb-6">Track, simulate and improve your skin with a gentle daily companion.</p>
            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-primary">
                  <span className="tk-icon-circle w-6 h-6 shrink-0 bg-paper text-accent" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted">Skin wellness, not medical advice.</p>
        </aside>
        <div className="p-6 sm:p-8 lg:p-10 space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-primary">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
