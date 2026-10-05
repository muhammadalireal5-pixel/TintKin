import Link from "next/link";
import { FileText } from "lucide-react";
import GenerateReportForm from "@/app/reports/GenerateReportForm";
import { SCANS_PER_REPORT } from "@/lib/constants/reports";

/** Compact dashboard card shown once the user's next weekly report is unlocked. */
export default function ReportReadyPrompt({ status }) {
  if (!status?.ready) return null;

  return (
    <div className="tk-card mb-6 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ring-2 ring-sage/30 tk-anim-1">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative w-11 h-11 rounded-2xl bg-sage/15 flex items-center justify-center shrink-0">
          <FileText size={20} className="text-sage" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D9534F] ring-2 ring-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">Your weekly report is ready</p>
          <p className="text-xs text-muted">
            You&apos;ve completed {SCANS_PER_REPORT} scans. <Link href="/reports" className="underline underline-offset-2 hover:text-primary">See all reports</Link>
          </p>
        </div>
      </div>
      <div className="shrink-0">
        <GenerateReportForm status={status} compact />
      </div>
    </div>
  );
}
