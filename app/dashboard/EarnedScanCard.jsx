import Link from "next/link";
import { ScanFace } from "lucide-react";

export default function EarnedScanCard({ mirror }) {
  if (!mirror?.earnedScan) return null;
  return (
    <section className="tk-card p-4 flex items-center gap-3" aria-label="You earned a scan">
      <span className="shrink-0 w-10 h-10 rounded-full bg-accent-soft text-accent-deep flex items-center justify-center">
        <ScanFace size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">You&apos;ve felt better {mirror.betterDays} of the last {mirror.window} days</p>
        <p className="text-xs text-muted">Want to measure it? A scan shows what changed.</p>
      </div>
      <Link href="/capture" className="tk-pill-btn tk-btn-primary px-4 py-2 text-sm shrink-0">Scan</Link>
    </section>
  );
}
