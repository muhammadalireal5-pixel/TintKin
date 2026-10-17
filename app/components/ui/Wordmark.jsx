import Link from "next/link";

/** Text logo, set in the display serif like the reference's "nira" mark. */
export default function Wordmark({ href = "/", className = "text-3xl", asLink = true }) {
  const mark = <span className={`tk-wordmark ${className}`}>tintkin</span>;
  if (!asLink) return mark;
  return (
    <Link href={href} aria-label="TintKin home" className="inline-flex items-center hover:opacity-85 transition-opacity">
      {mark}
    </Link>
  );
}
