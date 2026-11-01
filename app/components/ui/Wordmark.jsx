import Link from "next/link";
import Image from "next/image";

/** The TintKin logo. Size it with a height class (e.g. "h-10"); width follows. */
export default function Wordmark({ href = "/", className = "h-10", asLink = true }) {
  const mark = <Image src="/logo-clean.png" alt="TintKin" width={522} height={218} sizes="144px" className={`w-auto ${className}`} />;
  if (!asLink) return mark;
  return (
    <Link href={href} aria-label="TintKin home" className="inline-flex items-center hover:opacity-85 transition-opacity">
      {mark}
    </Link>
  );
}
