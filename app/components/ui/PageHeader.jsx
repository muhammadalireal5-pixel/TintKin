/**
 * Standard page heading used by every inner page so titles line up the same
 * way on phone and desktop. `action` is an optional right-aligned node.
 */
export default function PageHeader({ eyebrow, title, subtitle, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 sm:mb-7 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-muted mb-0.5">{eyebrow}</p>}
        <h1 className="text-[1.75rem] sm:text-4xl font-semibold text-primary leading-tight">{title}</h1>
        {subtitle && <p className="text-sm sm:text-base text-muted mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
