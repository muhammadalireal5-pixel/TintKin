"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { FileText, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { generateReport } from "@/app/lib/actions";
import { refreshReportStatus } from "@/app/components/reportStatus";

function SubmitButton({ ready }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !ready}
      className={`tk-pill-btn tk-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : ready ? <FileText size={16} /> : <Lock size={15} />}
      {pending ? "Generating…" : ready ? "Generate my report" : "Locked"}
    </button>
  );
}

/** Seven dots, one per scan, filled as the user progresses toward the next report. */
export function ScanProgress({ count, required }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${count} of ${required} scans`}>
      {Array.from({ length: required }, (_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 max-w-8 rounded-full transition-colors ${i < count ? "bg-sage" : "bg-[rgba(44,62,80,0.1)]"}`}
        />
      ))}
    </div>
  );
}

export default function GenerateReportForm({ status, compact = false }) {
  const router = useRouter();
  const [state, formAction] = useActionState(generateReport, null);
  const ready = Boolean(status?.ready);

  useEffect(() => {
    if (!state?.success) return;
    refreshReportStatus();
    if (compact) router.push("/reports");
  }, [state, compact, router]);

  return (
    <form action={formAction} className="space-y-3">
      {!compact && status && (
        <div className="space-y-2">
          <ScanProgress count={status.count} required={status.required} />
          <p className="text-xs text-muted">
            {ready
              ? "All 7 scans done. Your report is ready!"
              : `${status.count} of ${status.required} scans · ${status.remaining} more to unlock your next report`}
          </p>
        </div>
      )}
      <SubmitButton ready={ready} />
      {state && !state.success && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          {state.error}
        </p>
      )}
      {state?.success && !compact && (
        <p className="flex items-center gap-1.5 text-sm text-[#5E6B3A]">
          <CheckCircle2 size={14} className="shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  );
}
