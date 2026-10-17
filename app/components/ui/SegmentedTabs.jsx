"use client";

/**
 * Pill segmented control (the Skin | Hair toggle in the reference design).
 * items: [{ id, label, icon?: ReactNode, disabled? }]
 */
export default function SegmentedTabs({ items, value, onChange, className = "", label = "View", ...rest }) {
  return (
    <div role="tablist" aria-label={label} className={`tk-segmented ${className}`} {...rest}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          disabled={item.disabled}
          onClick={() => onChange(item.id)}
          className="tk-segmented-item disabled:opacity-50"
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
