/**
 * Full-area loading state in the TintKin palette: a breathing lavender/peach
 * orb with sage dots orbiting it. Pure CSS (see .tk-loader-* in globals.css),
 * so it works in server and client components alike.
 */
export default function BrandLoader({ message = "Loading..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 min-h-[calc(100dvh-80px)] flex-col items-center justify-center gap-7 tk-mesh-bg px-4 py-8"
    >
      <div className="tk-loader" aria-hidden="true">
        <span className="tk-loader-halo" />
        <span className="tk-loader-orbit">
          <span className="tk-loader-dot" />
          <span className="tk-loader-dot tk-loader-dot--sm" />
        </span>
        <span className="tk-loader-core">✦</span>
      </div>
      <p className="tk-loader-text font-display text-lg text-primary tracking-wide">{message}</p>
    </div>
  );
}
