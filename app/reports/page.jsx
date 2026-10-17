import { getLatestData, getUserReports, getReportStatus } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/components/ui/PageHeader";
import { ArrowLeft, Calendar, FileText, Sparkles } from "lucide-react";
import GenerateReportForm from "./GenerateReportForm";
import ReportCard from "./ReportCard";
import { SCANS_PER_REPORT } from "@/lib/constants/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const { user } = await getLatestData();
    if (!user?.onboardingComplete) redirect("/onboarding");

    const [reports, status] = await Promise.all([getUserReports(), getReportStatus()]);

    return (
        <div className="tk-container py-6 sm:py-10">
            <PageHeader
                eyebrow="Insights & Analytics"
                title="Skin Reports"
                action={
                    <Link
                        href="/dashboard"
                        className="tk-pill-btn tk-btn-ghost inline-flex items-center gap-1.5 text-sm"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                }
            />

            {/* Next report */}
            <section className={`tk-card p-5 sm:p-6 mb-8 tk-anim-1 ${status?.ready ? "ring-2 ring-accent/40" : ""}`}>
                <div className="flex items-start gap-4">
                    <div className="tk-icon-circle w-11 h-11 sm:w-12 sm:h-12 shrink-0">
                        <Sparkles size={22} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-primary mb-1">
                            {status?.ready ? "Your weekly report is ready" : "Your next weekly report"}
                        </h2>
                        <p className="text-sm text-muted mb-4 max-w-2xl">
                            A new report unlocks every {SCANS_PER_REPORT} scans: a look back at your week with
                            your trends, strongest areas and a little encouragement.
                        </p>
                        <GenerateReportForm status={status} />
                    </div>
                </div>
            </section>

            {/* Reports list */}
            <h2 className="tk-section-title mb-3 flex items-center gap-2">
                <Calendar size={18} className="text-accent" />
                Your Reports
            </h2>

            {reports.length === 0 ? (
                <div className="tk-card p-8 sm:p-12 text-center">
                    <div className="tk-icon-circle w-14 h-14 mx-auto mb-4">
                        <FileText size={26} className="text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary mb-2">No reports yet</h3>
                    <p className="text-muted text-sm max-w-md mx-auto">
                        Complete {SCANS_PER_REPORT} scans and your first weekly report will unlock here. We&apos;ll
                        also let you know by email.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <ReportCard key={report.id} report={report} userName={user.displayName || ""} />
                    ))}
                </div>
            )}
        </div>
    );
}
