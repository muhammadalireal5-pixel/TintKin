import { getLatestData, getUserReports, getReportStatus } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
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
        <div className="min-h-[calc(100vh-80px)] bg-base py-6 sm:py-12 px-4 sm:px-6 lg:px-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
                    <Link
                        href="/dashboard"
                        className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={20} className="text-primary" />
                    </Link>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-1">
                            Insights &amp; Analytics
                        </p>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-medium text-primary">
                            Skin <span className="italic text-sage">Reports</span>
                        </h1>
                    </div>
                </div>

                {/* Next report */}
                <section className={`tk-card p-5 sm:p-6 mb-8 tk-anim-1 ${status?.ready ? "ring-2 ring-sage/40" : ""}`}>
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sage/15 flex items-center justify-center shrink-0">
                            <Sparkles size={22} className="text-sage" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-xl font-display font-medium text-primary mb-1">
                                {status?.ready ? "Your weekly report is ready" : "Your next weekly report"}
                            </h2>
                            <p className="text-sm text-muted mb-4">
                                A new report unlocks every {SCANS_PER_REPORT} scans: a look back at your week with
                                your trends, strongest areas and a little encouragement.
                            </p>
                            <GenerateReportForm status={status} />
                        </div>
                    </div>
                </section>

                {/* Reports list */}
                <h2 className="text-lg font-display font-medium text-primary mb-3 flex items-center gap-2">
                    <Calendar size={18} className="text-sage" />
                    Your Reports
                </h2>

                {reports.length === 0 ? (
                    <div className="tk-card p-8 sm:p-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-4">
                            <FileText size={26} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-display font-medium text-primary mb-2">No reports yet</h3>
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
        </div>
    );
}
