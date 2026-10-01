"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { generateReport } from "@/app/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tk-pill-btn tk-btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
      {pending ? "Generating..." : "Generate Report Now"}
    </button>
  );
}

export default function GenerateReportForm() {
  const [state, formAction] = useActionState(generateReport, null);

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton />
      {state && !state.success && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="flex items-center gap-1.5 text-sm text-sage">
          <CheckCircle2 size={14} className="shrink-0" />
          {state.message}
        </p>
      )}
    </form>
  );
}
