import Link from "next/link";
import { ScanFace, ArrowRight } from "lucide-react";

/**
 * Shown on Today until the user has a scan. A scan is never needed for the
 * plan; it only adds measured numbers next to the self-ratings.
 */
export default function ScanInvite() {
  return (
    <section className="tk-card p-4 sm:p-5 flex items-center gap-4" aria-label="Optional progress scan">
      <span className="tk-icon-circle w-11 h-11 shrink-0"><ScanFace size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-primary">Want to see your progress in numbers?</p>
        <p className="text-sm text-muted">Optional. A progress scan measures your skin so your check-ins show real change. Your plan works without it.</p>
      </div>
      <Link href="/capture" className="tk-pill-btn tk-btn-soft px-4 py-2.5 text-sm shrink-0">
        Scan <ArrowRight size={14} />
      </Link>
    </section>
  );
}
