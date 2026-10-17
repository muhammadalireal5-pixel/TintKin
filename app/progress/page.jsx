import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Share2, History, ChevronRight, Sparkles, CalendarCheck } from "lucide-react";
import { getLatestData } from "@/app/lib/actions";
import PageHeader from "@/app/components/ui/PageHeader";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import { ProgressChart, RadarChartClient } from "@/app/dashboard/LazyCharts";
import TrophyCase from "@/app/dashboard/TrophyCase";
import LeaderboardCard from "@/app/dashboard/LeaderboardCard";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Your Progress",
    description: "Track your skin score over time, your streak and trophies.",
    robots: { index: false, follow: false },
};

const SELFIE_LIMIT = 20;

function Stat({ label, value, sub, icon: Icon }) {
    return (
        <div className="tk-tile p-4">
            <div className="flex items-center gap-1.5 text-muted">
                {Icon && <Icon size={14} className="text-accent" />}
                <p className="text-xs font-medium">{label}</p>
            </div>
            <p className="mt-1.5 text-2xl sm:text-3xl font-semibold text-primary tabular-nums leading-none">{value}</p>
            {sub && <p className="mt-1.5 text-[11px] text-muted">{sub}</p>}
        </div>
    );
}

export default async function ProgressPage() {
    const { user, latestSelfie, latestAnalyzedSelfie, allSelfies, hasMoreSelfies, realAge, weeklyAverage, habitConsistency, achievements, achievementStats } = await getLatestData(null, { selfieLimit: SELFIE_LIMIT });
    if (!latestSelfie) redirect("/capture");

    const source = latestAnalyzedSelfie || latestSelfie;
    const hasSkinAge = typeof source.skinAge === "number";
    const ageDiff = hasSkinAge && typeof realAge === "number" ? realAge - source.skinAge : null;

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <PageHeader
                eyebrow="Your journey"
                title="Progress"
                subtitle="See how your skin is changing, scan by scan."
                action={
                    <Link href="/share" className="tk-pill-btn tk-btn-soft px-4 py-2.5 text-sm">
                        <Share2 size={15} /> <span className="hidden sm:inline">Share card</span>
                    </Link>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <Stat
                    icon={Flame}
                    label="Streak"
                    value={`${user?.currentStreak || 0}d`}
                    sub={user?.currentStreak > 0 ? "Keep it going" : "Scan to start one"}
                />
                <Stat
                    icon={CalendarCheck}
                    label="This week"
                    value={typeof weeklyAverage?.overallScore === "number" ? weeklyAverage.overallScore : "—"}
                    sub={weeklyAverage ? `${weeklyAverage.scanCount} ${weeklyAverage.scanCount === 1 ? "scan" : "scans"}` : "First scan this week"}
                />
                <Stat
                    icon={Sparkles}
                    label="Skin age"
                    value={hasSkinAge ? source.skinAge : "—"}
                    sub={ageDiff == null ? "Add birth date to compare" : ageDiff > 0 ? `${ageDiff} yrs younger than you` : ageDiff < 0 ? `${-ageDiff} yrs above your age` : "On your age"}
                />
                <Stat
                    icon={CalendarCheck}
                    label="Consistency"
                    value={typeof habitConsistency?.consistencyPct === "number" ? `${habitConsistency.consistencyPct}%` : "—"}
                    sub="Routine days, last 7"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                <section className="tk-card p-5 sm:p-6 lg:col-span-2 flex flex-col min-h-[22rem]">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[15px] font-semibold text-primary">Skin score over time</h2>
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

                <section className="tk-card p-5 sm:p-6 flex flex-col">
                    <h2 className="text-[15px] font-semibold text-primary">Skin profile</h2>
                    <div className="relative flex-1 min-h-[16rem] mt-1">
                        <ComponentErrorFallback title="Radar Chart">
                            <RadarChartClient scores={source.scores} />
                        </ComponentErrorFallback>
                    </div>
                </section>
            </div>

            <section className="mt-8">
                <h2 className="text-xl font-semibold text-primary mb-3">Trophies</h2>
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
                        Full leaderboard <ChevronRight size={15} />
                    </Link>
                </div>
                <div className="max-w-xl">
                    <LeaderboardCard />
                </div>
            </section>
        </div>
    );
}
