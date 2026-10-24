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
        <p className="text-xs text-muted">
          {ready
            ? `Your day ${status.checkInDay} check-in is done. Your report is ready!`
            : status.nextCheckInDay
              ? `Unlocks when you complete your day ${status.nextCheckInDay} check-in.`
              : status.hasPlan
                ? "Your plan's check-ins are all done."
                : "Reports unlock with your 30-day plan check-ins."}
        </p>
      )}
      <SubmitButton ready={ready} />
      {state && !state.success && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle size={14} className="shrink-0" />
          {state.error}
        </p>
      )}
      {state?.success && !compact && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 size={14} className="shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  );
}
