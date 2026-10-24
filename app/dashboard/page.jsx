import { getLatestData, getReportStatus } from "@/app/lib/actions";
import { getActivePlan } from "@/app/lib/plan-actions";
import PlanTodayCard from "@/app/plan/PlanTodayCard";
import PlanBuilder from "@/app/plan/PlanBuilder";
import FirstWeekChecklist from "./FirstWeekChecklist";
import AnnouncementModal from "./AnnouncementModal";
import { CURRENT_ANNOUNCEMENT, shouldShowAnnouncement } from "@/lib/constants/announcements";
import { RadarChartClient } from "./LazyCharts";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import LocationPrompt from "./LocationPrompt";
import EmailVerificationBanner from "./EmailVerificationBanner";
import ReportReadyPrompt from "./ReportReadyPrompt";
import StreakPhotoBanner from "./StreakPhotoBanner";
import TodayView from "./TodayView";
import ScanInvite from "./ScanInvite";
import { buildSkinSummary } from "./skin-summary";
import { EMAIL_VERIFICATION_ENABLED } from "@/app/lib/feature-flags";

export const dynamic = "force-dynamic";

const DASHBOARD_SELFIE_LIMIT = 20;

async function DashboardContent() {
    const { user, latestSelfie, latestAnalyzedSelfie, allSelfies, realAge, weeklyAverage, todayRoutineLog, todayRoutine, achievementStats, activity, newlyUnlockedTitles } = await getLatestData(null, { selfieLimit: DASHBOARD_SELFIE_LIMIT });
    const [reportStatus, planRes] = await Promise.all([getReportStatus(), getActivePlan()]);
    const plan = planRes?.success ? planRes.plan : null;

    // Today's step counts come from the plan when there is one (not the scan).
    const sourceData = { ...(latestAnalyzedSelfie || latestSelfie || {}), amRoutine: todayRoutine.am, pmRoutine: todayRoutine.pm };
    const summary = buildSkinSummary({
        user,
        sourceData,
        latestSelfie,
        allSelfies,
        realAge,
        weeklyAverage,
        todayRoutineLog,
        achievementStats,
        activity,
        newlyUnlockedTitles,
        reportReady: Boolean(reportStatus?.ready),
    });

    const stepsLeft = Math.max(0, summary.plan.amTotal + summary.plan.pmTotal - summary.plan.amDone - summary.plan.pmDone);
    const sinceStart = plan && typeof plan.baseline?.overallScore === "number"
        ? { from: Math.round(plan.baseline.overallScore), delta: plan.progress.overallDelta }
        : null;

    const firstWeek = plan && plan.day <= 14
        ? [
            { label: "Tell us about your skin", done: true },
            { label: "Get your 30-day plan", done: true },
            { label: "Tick your first routine step", done: (user?.routineDays || 0) > 0, href: "/routine", hint: "Tap a step on your plan once you have done it." },
            {
                label: "Do your week-1 check-in",
                done: plan.checkIns[0]?.status === "done",
                href: plan.nextCheckIn?.isDue ? "/capture" : "/routine",
                hint: plan.nextCheckIn?.isDue ? "It's ready: one scan shows your first change." : "On day 7, one scan shows your first change.",
            },
        ]
        : null;

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            {shouldShowAnnouncement(user) && <AnnouncementModal id={CURRENT_ANNOUNCEMENT.id} />}
            <TodayView
                data={summary}
                sinceStart={sinceStart}
                // Extras appear once the user has shown up a few times.
                showLeaderboard={(user?.routineDays || 0) >= 3}
                planCard={plan ? <PlanTodayCard plan={plan} stepsLeft={stepsLeft} /> : <PlanBuilder compact />}
                banners={
                    <>
                        {EMAIL_VERIFICATION_ENABLED && <EmailVerificationBanner user={user} />}
                        <LocationPrompt user={user} />
                        <ReportReadyPrompt status={reportStatus} />
                        {firstWeek && <FirstWeekChecklist items={firstWeek} />}
                        {latestSelfie?.isAnalyzed === false && (
                            <StreakPhotoBanner latestSelfie={latestSelfie} user={user} />
                        )}
                    </>
                }
                scanInvite={latestSelfie ? null : <ScanInvite />}
                radar={sourceData.scores ? (
                    <ComponentErrorFallback title="Radar Chart">
                        <RadarChartClient scores={sourceData.scores} />
                    </ComponentErrorFallback>
                ) : null}
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
