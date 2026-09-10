import { getLatestData, generateReport } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Share2, Calendar, FileText, Sparkles, Clock } from "lucide-react";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const { user, allSelfies } = await getLatestData();
    if (!user?.onboardingComplete) redirect("/onboarding");

    // Get available reports (auto-generated weekly/monthly + manual)
    const reports = [];
    
    // Generate sample reports for demonstration
    const now = new Date();
    const weeklyDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthlyDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    reports.push({
        id: "weekly-" + weeklyDate.toISOString().split('T')[0],
        type: "weekly",
        title: "Weekly Skin Analysis",
        date: weeklyDate,
        summary: "Your skin showed remarkable improvement this week! Hydration levels increased by 12%, and texture smoothness improved significantly.",
        highlights: ["Increased hydration", "Reduced redness", "Better texture"],
        aiGenerated: true
    });
    
    reports.push({
        id: "monthly-" + monthlyDate.toISOString().split('T')[0],
        type: "monthly", 
        title: "Monthly Skin Journey",
        date: monthlyDate,
        summary: "This month has been transformative for your skin. Consistent routine adherence resulted in visible improvements across all metrics.",
        highlights: ["15% overall score improvement", "Consistent routine", "Age reversal detected"],
        aiGenerated: true
    });

    return (
        <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                    <Link 
                        href="/dashboard"
                        className="p-2 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-primary" />
                    </Link>
                    <div>
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-2">
                            Insights & Analytics
                        </p>
                        <h1 className="text-4xl lg:text-5xl font-display font-medium text-primary">
                            Skin <span className="italic text-sage">Reports</span>
                        </h1>
                    </div>
                </div>

                {/* Manual Report Generation */}
                <div className="tk-glass p-6 rounded-3xl mb-8 tk-anim-1">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-sage/15 border border-sage/20 flex items-center justify-center shrink-0">
                            <Sparkles size={24} className="text-sage" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-display font-medium text-primary mb-2">
                                Generate New Report
                            </h2>
                            <p className="text-sm text-muted mb-4">
                                Create a personalized AI-powered analysis of your skin journey. 
                                Available every 3 days with complimentary praise and actionable insights.
                            </p>
                            <form action={generateReport}>
                                <button 
                                    type="submit"
                                    className="tk-pill-btn tk-btn-primary flex items-center gap-2"
                                >
                                    <FileText size={16} />
                                    Generate Report Now
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Reports List */}
                <div className="grid gap-4">
                    <h2 className="text-lg font-display font-medium text-primary mb-2 flex items-center gap-2">
                        <Calendar size={18} className="text-sage" />
                        Your Reports
                    </h2>
                    
                    {reports.length === 0 ? (
                        <div className="tk-glass p-12 rounded-3xl text-center">
                            <div className="w-16 h-16 rounded-full bg-lavender/20 flex items-center justify-center mx-auto mb-4">
                                <FileText size={32} className="text-lavender" />
                            </div>
                            <h3 className="text-lg font-display font-medium text-primary mb-2">
                                No Reports Yet
                            </h3>
                            <p className="text-muted text-sm max-w-md mx-auto">
                                Weekly and monthly reports are automatically generated based on your scan history. 
                                Generate your first manual report above!
                            </p>
                        </div>
                    ) : (
                        reports.map((report, idx) => (
                            <div 
                                key={report.id}
                                className="tk-glass p-6 rounded-3xl tk-anim-2 flex flex-col md:flex-row gap-6"
                                style={{ animationDelay: `${idx * 0.1}s` }}
                            >
                                {/* Report Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                                            report.type === 'weekly' 
                                                ? 'bg-sage/15 text-sage' 
                                                : 'bg-lavender/15 text-lavender'
                                        }`}>
                                            {report.type} Report
                                        </span>
                                        {report.aiGenerated && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-orange/10 text-orange-600 flex items-center gap-1">
                                                <Sparkles size={10} /> AI Generated
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl font-display font-medium text-primary mb-2">
                                        {report.title}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-xs text-muted mb-3">
                                        <Clock size={14} />
                                        {report.date.toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </div>
                                    
                                    <p className="text-sm text-muted leading-relaxed mb-4">
                                        {report.summary}
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {report.highlights.map((highlight, i) => (
                                            <span 
                                                key={i}
                                                className="text-xs px-3 py-1 rounded-full bg-sage/10 text-sage font-medium"
                                            >
                                                ✓ {highlight}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex md:flex-col gap-2 shrink-0">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
                                        <Download size={14} />
                                        Download PDF
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 border border-lavender text-primary text-xs font-semibold hover:bg-white transition-colors">
                                        <Share2 size={14} />
                                        Share
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sharing Options Modal Placeholder */}
                <div className="mt-8 tk-glass p-6 rounded-3xl">
                    <h3 className="text-lg font-display font-medium text-primary mb-4 flex items-center gap-2">
                        <Share2 size={18} className="text-sage" />
                        Share Your Progress
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        <button className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#E4405F] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            Instagram
                        </button>
                        <button className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92-.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.63-4.92 1.66-1.33 3.86-1.87 5.95-1.47.59.11 1.17.29 1.72.53V.02z"/></svg>
                            TikTok
                        </button>
                        <button className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#25D366] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
