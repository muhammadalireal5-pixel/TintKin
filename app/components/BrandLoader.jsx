/**
 * Full-area loading state in the TintKin palette: a breathing blush/peach
 * orb with terracotta dots orbiting it. Pure CSS (see .tk-loader-* in globals.css),
 * so it works in server and client components alike.
 */
export default function BrandLoader({ message = "Loading..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 min-h-[60dvh] w-full flex-col items-center justify-center gap-7 px-4 py-8"
    >
      <div className="tk-loader" aria-hidden="true">
        <span className="tk-loader-halo" />
        <span className="tk-loader-orbit">
          <span className="tk-loader-dot" />
          <span className="tk-loader-dot tk-loader-dot--sm" />
        </span>
        <span className="tk-loader-core">✦</span>
      </div>
      <p className="tk-loader-text text-lg font-medium text-primary tracking-wide">{message}</p>
    </div>
  );
}
