import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";

/**
 * Shown to accounts made before the skin questionnaire existed. Their plan
 * still works; the new answers make it safer and more personal.
 */
export default function ProfileUpdateBanner() {
  return (
    <Link
      href="/profile/skin"
      className="tk-card p-4 flex items-center gap-3 !bg-accent-soft hover:border-accent/50 transition-colors"
    >
      <span className="tk-icon-circle w-10 h-10 bg-white shrink-0"><ClipboardList size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-primary">Update your skin profile</span>
        <span className="block text-xs text-muted">TintKin has changed: answer a few new questions for a safer, more personal plan.</span>
      </span>
      <ArrowRight size={16} className="text-accent shrink-0" />
    </Link>
  );
}
