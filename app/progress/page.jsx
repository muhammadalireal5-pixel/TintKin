import { redirect } from "next/navigation";
import Link from "next/link";
import { Share2, History } from "lucide-react";
import { getLatestData } from "@/app/lib/actions";
import { getActivePlan } from "@/app/lib/plan-actions";
import PlanProgress from "@/app/plan/PlanProgress";
import ScanInvite from "@/app/dashboard/ScanInvite";
import KinAvatar from "@/app/components/companion/KinAvatar";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import { ProgressChart } from "@/app/dashboard/LazyCharts";
import TrophyCase from "@/app/dashboard/TrophyCase";
import LeaderboardCard from "@/app/dashboard/LeaderboardCard";
import YouVsYouCard from "@/app/dashboard/YouVsYouCard";
import SkinProfileBars from "./SkinProfileBars";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Your Progress",
    description: "See your skin trend, your plan progress, your streak and milestones.",
    robots: { index: false, follow: false },
};

const SELFIE_LIMIT = 20;

export default async function ProgressPage() {
    const { user, latestSelfie, latestAnalyzedSelfie, allSelfies, hasMoreSelfies, achievements, achievementStats, activity, todayRoutine } = await getLatestData(null, { selfieLimit: SELFIE_LIMIT });
    const noScan = !latestSelfie;
    const planRes = await getActivePlan();
    const plan = planRes?.success ? planRes.plan : null;
    if (noScan && !plan) redirect("/dashboard");

    const source = latestAnalyzedSelfie || latestSelfie || {};
    const firstAnalyzed = (allSelfies || []).find((x) => x.isAnalyzed !== false && x.scores);
    const startScores = plan?.baseline?.scores || firstAnalyzed?.scores || null;
    const stepsTotal = (todayRoutine?.am?.length || 0) + (todayRoutine?.pm?.length || 0);

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <header className="relative mb-5 sm:mb-7 pr-24">
                <p className="text-sm text-muted mb-0.5">Your journey</p>
                <h1 className="text-[1.75rem] sm:text-4xl font-semibold text-primary leading-tight">Progress</h1>
                <p className="text-sm sm:text-base text-muted mt-1.5 max-w-xl">See how your skin is changing over time.</p>
                <Link href="/share" className="tk-pill-btn tk-btn-soft px-4 py-2 text-sm mt-3 inline-flex">
                    <Share2 size={15} /> Share card
                </Link>
                <KinAvatar size={88} className="absolute top-0 right-0" />
            </header>

            {noScan ? (
                <div className="grid lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">{plan && <PlanProgress progress={plan.progress} />}</div>
                    <ScanInvite />
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-5">
                    <section className="tk-card p-4 sm:p-6 lg:col-span-2 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[15px] font-semibold text-primary">Your trend</h2>
                            <Link href="/history" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-deep">
                                <History size={14} /> History
                            </Link>
                        </div>
                        <div className="flex-1 w-full relative">
                            <ComponentErrorFallback title="Progress Chart">
                                <ProgressChart allSelfies={allSelfies} hasMore={Boolean(hasMoreSelfies)} />
                            </ComponentErrorFallback>
                        </div>
                    </section>

                    <section className="tk-card p-4 sm:p-6 flex flex-col">
                        <h2 className="text-[15px] font-semibold text-primary mb-4">Skin profile</h2>
                        <SkinProfileBars scores={source.scores} baseline={startScores} />
                    </section>
                </div>
            )}

            <section className="mt-8 max-w-xl">
                <YouVsYouCard activity={activity} longestStreak={user?.longestStreak || 0} stepsTotal={stepsTotal} />
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-semibold text-primary mb-3">Milestones</h2>
                <TrophyCase
                    badges={user?.badges}
                    achievements={achievements}
                    achievementStats={achievementStats}
                    userName={user?.displayName || "Skin Seeker"}
                />
            </section>

            <section className="mt-8">
                <div className="flex items-end justify-between mb-3">
                    <h2 className="text-xl font-semibold text-primary">Community</h2>
                    <Link href="/leaderboard" className="inline-flex items-center gap-0.5 text-sm font-semibold text-accent hover:text-accent-deep">
                        Full board
                    </Link>
                </div>
                <div className="max-w-xl">
                    <LeaderboardCard hasCity={Boolean(user?.location?.city)} />
                </div>
            </section>
        </div>
    );
}
