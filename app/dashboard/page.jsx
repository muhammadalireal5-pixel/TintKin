import { getLatestData, getReportStatus } from "@/app/lib/actions";
import { RadarChartClient } from "./LazyCharts";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import LocationPrompt from "./LocationPrompt";
import EmailVerificationBanner from "./EmailVerificationBanner";
import ReportReadyPrompt from "./ReportReadyPrompt";
import StreakPhotoBanner from "./StreakPhotoBanner";
import TodayView from "./TodayView";
import FirstScanWelcome from "./FirstScanWelcome";
import { buildSkinSummary } from "./skin-summary";
import { EMAIL_VERIFICATION_ENABLED } from "@/app/lib/feature-flags";

export const dynamic = "force-dynamic";

const DASHBOARD_SELFIE_LIMIT = 20;

async function DashboardContent() {
    const { user, latestSelfie, latestAnalyzedSelfie, allSelfies, realAge, weeklyAverage, todayRoutineLog, achievementStats } = await getLatestData(null, { selfieLimit: DASHBOARD_SELFIE_LIMIT });
    // Brand-new account: show a welcome with one clear next step (Kin adds its own
    // prompt) instead of bouncing straight to the camera.
    if (!latestSelfie) return <FirstScanWelcome firstName={(user?.displayName || "").trim().split(/\s+/)[0]} />;
    const reportStatus = await getReportStatus();

    const sourceData = latestAnalyzedSelfie || latestSelfie;
    const summary = buildSkinSummary({
        user,
        sourceData,
        latestSelfie,
        allSelfies,
        realAge,
        weeklyAverage,
        todayRoutineLog,
        achievementStats,
        reportReady: Boolean(reportStatus?.ready),
    });

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <TodayView
                data={summary}
                banners={
                    <>
                        {EMAIL_VERIFICATION_ENABLED && <EmailVerificationBanner user={user} />}
                        <LocationPrompt user={user} />
                        <ReportReadyPrompt status={reportStatus} />
                        {latestSelfie.isAnalyzed === false && (
                            <StreakPhotoBanner latestSelfie={latestSelfie} user={user} />
                        )}
                    </>
                }
                radar={
                    <ComponentErrorFallback title="Radar Chart">
                        <RadarChartClient scores={sourceData.scores} />
                    </ComponentErrorFallback>
                }
            />
        </div>
    );
}

function DashboardFallback() {
    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10" aria-busy="true">
            <div className="max-w-xl space-y-4 animate-pulse">
                <div className="h-4 w-28 rounded-full bg-blush" />
                <div className="h-9 w-48 rounded-full bg-blush" />
                <div className="h-12 rounded-full bg-blush" />
                <div className="h-44 rounded-[1.25rem] bg-blush" />
                <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-blush" />)}
                </div>
            </div>
        </div>
    );
}

export default async function DashboardPage() {
    try {
        return await DashboardContent();
    } catch (error) {
        // Next.js implements redirect() by throwing; let it propagate instead of
        // treating it as a data-load failure (which would trap the user on this
        // skeleton screen forever instead of sending them to /capture).
        if (error?.digest?.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        // If data fails to load, show skeleton loaders
        return <DashboardFallback />;
    }
}
