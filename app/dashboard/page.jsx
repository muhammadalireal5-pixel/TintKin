import { getLatestData } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import RadarChartClient from "./RadarChartClient";
import ProgressChart from "./ProgressChart";
import ScoreCarousel from "./ScoreCarousel";
import Link from "next/link";
import ProductImage from "./ProductImage";
import { Sparkles, ArrowRight, Dumbbell, Flame, Camera, Share2 } from "lucide-react";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import LocationPrompt from "./LocationPrompt";
import RoutineChecklist from "./RoutineChecklist";
import TrophyCase from "./TrophyCase";
import PercentileCard from "./PercentileCard";

export default async function DashboardPage() {
    const { user, latestSelfie, latestAnalyzedSelfie, allSelfies, realAge, weeklyAverage, todayRoutineLog, achievements, achievementStats } = await getLatestData();
    if (!latestSelfie) redirect("/capture");

    const sourceData = latestAnalyzedSelfie || latestSelfie;
    const { overallScore, skinAge, scores, critique, amRoutine, pmRoutine, facialWorkout, adviceStatus } = sourceData;
    
    const hasSkinAge = typeof skinAge === "number";
    const hasRealAge = typeof realAge === "number";
    const skinOlder = hasSkinAge && hasRealAge && skinAge > realAge;
    const ageDelta = hasSkinAge && hasRealAge ? Math.abs(skinAge - realAge) : null;

    const hasPersonalizedProducts = Array.isArray(latestSelfie?.recommendedProducts) && latestSelfie.recommendedProducts.length > 0;
    const products = hasPersonalizedProducts
        ? latestSelfie.recommendedProducts
        : [
            {
                type: "Cleanser",
                formula: "Gentle Hydrating Cleanser",
                description: "Mild cleanser that maintains your skin barrier.",
                isStarter: true
            },
            {
                type: "Serum",
                formula: "Vitamin C + Niacinamide",
                description: "Brightens tone and fades dark spots.",
                isStarter: true
            },
            {
                type: "Moisturizer",
                formula: "Ceramide Cream",
                description: "Locks in moisture and strengthens barrier.",
                isStarter: true
            },
        ];

    return (
        <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
            <LocationPrompt user={user} />
            <div className="max-w-6xl mx-auto">
                
                {/* Page Title */}
                <div className="mb-8 tk-anim-1 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-2">
                            Your Skin Journal
                        </p>
                        <h1 className="text-4xl lg:text-5xl font-display font-medium text-primary">
                            Today&apos;s <span className="italic text-sage">Insight</span>
                        </h1>
                    </div>
                    {user?.currentStreak > 0 && (
                        <div>
                            <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full border border-orange-200 shadow-sm">
                                <Flame className="w-5 h-5 text-orange-500 tk-anim-flame" />
                                <span className="font-bold text-orange-600">{user.currentStreak} Day Streak</span>
                            </div>
                        </div>
                    )}
                </div>

                {latestSelfie && latestSelfie.isAnalyzed === false && (
                    <div className="mb-8 p-4 bg-sage/10 border border-sage/30 rounded-2xl flex items-start gap-3 tk-anim-2">
                        <Sparkles className="w-5 h-5 text-sage shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-primary">Photo logged!</h3>
                            <p className="text-sm text-muted">You&apos;ve successfully maintained your streak today. Your next deep analysis is coming up based on your subscription tier.</p>
                        </div>
                    </div>
                )}

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 overflow-hidden">

                    {/* ✅ Daily Routine — first item, full width */}
                    <div className="md:col-span-3 lg:col-span-4 flex flex-col tk-anim-2">
                        <RoutineChecklist 
                            amRoutine={amRoutine} 
                            pmRoutine={pmRoutine} 
                            completedAm={todayRoutineLog?.amCompleted || []} 
                            completedPm={todayRoutineLog?.pmCompleted || []} 
                        />
                    </div>

                    {/* Overall Harmony */}
                    <div className="tk-glass p-8 md:col-span-2 lg:col-span-2 flex flex-col justify-between tk-anim-3 relative">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-semibold tracking-widest uppercase text-muted">Overall Harmony</p>
                                <div className="flex items-center gap-3">
                                    <Link href="/share" className="text-xs font-semibold text-sage hover:text-primary transition-colors flex items-center gap-1.5 bg-sage/10 px-3 py-1 rounded-full border border-sage/20">
                                        <Share2 size={12} /> Share Card
                                    </Link>
                                    <Link href="/history" className="text-xs font-medium text-muted hover:text-primary transition-colors flex items-center gap-1">
                                        History <ArrowRight size={13} />
                                    </Link>
                                </div>
                            </div>
                            <p className="text-sm text-primary mb-6">Your skin&apos;s overall balance and vitality.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
                            {/* Today */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Today</p>
                                <div className="flex items-end gap-2">
                                    <h2 className="text-5xl sm:text-6xl font-display font-medium text-primary leading-none">
                                        {typeof overallScore === 'number' ? overallScore : "—"}
                                    </h2>
                                    <span className="text-lg text-muted mb-1">/ 100</span>
                                </div>
                            </div>
                            
                            <div className="hidden sm:block w-px h-16 bg-black/10"></div>
                            <div className="sm:hidden h-px w-full bg-black/5"></div>
                            
                            {/* This Week */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">This Week (Mon-Sun)</p>
                                {weeklyAverage?.overallScore != null ? (
                                    <>
                                        <div className="flex items-end gap-2">
                                            <h2 className="text-5xl sm:text-6xl font-display font-medium text-sage leading-none">
                                                {weeklyAverage.overallScore}
                                            </h2>
                                            <span className="text-lg text-muted mb-1">/ 100</span>
                                        </div>
                                        <p className="text-[10px] text-muted mt-1 uppercase tracking-wider font-semibold">
                                            ── {weeklyAverage.scanCount} {weeklyAverage.scanCount === 1 ? 'scan' : 'scans'} ──
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-end gap-2">
                                            <h2 className="text-4xl sm:text-5xl font-display font-medium text-muted/60 leading-none">
                                                —
                                            </h2>
                                        </div>
                                        <p className="text-[10px] text-muted mt-1 uppercase tracking-wider font-semibold">
                                            First scan this week
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-solid border-black/5">
                            <p className="text-sm text-muted">
                                {critique || (adviceStatus === 'error' ? 'AI personalized advice is temporarily updating and will refresh on your next scan.' : typeof overallScore === 'number' && overallScore >= 80 ? 'Beautifully balanced. Keep nurturing it.' : typeof overallScore === 'number' && overallScore >= 60 ? 'A steady glow. Small tweaks can help.' : 'Take a moment for some extra care today.')}
                            </p>
                        </div>
                    </div>

                    {/* Age cards + Percentile */}
                    <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-1 tk-anim-3">
                        <div className="tk-glass p-6 flex-1 flex flex-col justify-center">
                            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Real Age</p>
                            <p className="text-4xl font-display text-primary">{hasRealAge ? realAge : "—"}</p>
                        </div>
                        
                        <div className={`tk-glass p-6 flex-1 flex flex-col justify-center border ${skinOlder ? 'border-sage/30' : 'border-lavender/40'}`}>
                            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Skin Age</p>
                            <div className="flex items-baseline gap-3">
                                <p className="text-4xl font-display text-primary">{hasSkinAge ? skinAge : "—"}</p>
                                {ageDelta != null && (
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${skinOlder ? 'bg-sage/15 text-sage' : 'bg-lavender/50 text-[#792CA2]'}`}>
                                        {skinOlder ? `+${ageDelta}` : `-${ageDelta}`} yrs
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1">
                            <PercentileCard optedIn={user.optInComparison} />
                        </div>
                    </div>

                    {/* Profile Radar */}
                    <div className="tk-glass p-8 md:col-span-3 lg:col-span-1 min-h-[300px] flex flex-col tk-anim-4">
                        <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-6">Profile Radar</p>
                        <div className="flex-1 w-full relative">
                            <ComponentErrorFallback title="Radar Chart">
                                <RadarChartClient scores={scores} />
                            </ComponentErrorFallback>
                        </div>
                    </div>

                    {/* Trophy Case (Full Width Landscape Banner) */}
                    <div className="col-span-1 md:col-span-3 lg:col-span-4 tk-anim-4 flex flex-col" style={{ animationDelay: '0.1s' }}>
                        <TrophyCase 
                            badges={user?.badges} 
                            achievements={achievements} 
                            achievementStats={achievementStats} 
                            userName={user?.displayName || "Wellness Seeker"} 
                        />
                    </div>

                    {/* Journey Chart */}
                    <div className="tk-glass p-8 md:col-span-3 lg:col-span-4 min-h-[400px] flex flex-col tk-anim-5">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Journey</p>
                                <p className="text-sm text-primary">Your progress over time.</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full relative">
                            <ComponentErrorFallback title="Progress Chart">
                                <ProgressChart allSelfies={allSelfies} />
                            </ComponentErrorFallback>
                        </div>
                    </div>

                    {/* 💪 Facial Workout — full width, polished */}
                    <div className="tk-glass p-8 md:col-span-3 lg:col-span-4 flex flex-col tk-anim-5" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-8 h-8 rounded-xl bg-sage/15 flex items-center justify-center shrink-0">
                                <Dumbbell size={16} className="text-sage" />
                            </div>
                            <p className="text-xs font-semibold tracking-widest uppercase text-muted">Targeted Facial Workout</p>
                        </div>
                        {facialWorkout ? (
                            <div className="bg-sage/10 p-5 rounded-2xl border border-sage/20">
                                {facialWorkout.includes(':') ? (
                                    <>
                                        <p className="font-display text-base font-medium text-primary mb-2">
                                            {facialWorkout.split(':')[0].trim()}
                                        </p>
                                        <p className="text-sm text-muted leading-relaxed">
                                            {facialWorkout.split(':').slice(1).join(':').trim()}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-primary leading-relaxed">{facialWorkout}</p>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white/50 p-5 rounded-2xl border border-lavender/50 text-center text-muted text-sm italic">
                                Analyze a new selfie to get a personalized facial workout.
                            </div>
                        )}
                    </div>

                    {/* Core Metrics Carousel */}
                    <ComponentErrorFallback title="Score Carousel">
                        <ScoreCarousel scores={scores} weeklyScores={weeklyAverage?.scores} />
                    </ComponentErrorFallback>
                    
                    {/* Recommended Products + What-If CTA */}
                    <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-4 space-y-6 animate-fade-in">
                        <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">Recommended Products</p>
                        <div className="mb-4 text-sm text-muted">
                            <p>Your routine for 30 days (consider a 1-month supply).</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.map((prod, idx) => (
                                <div key={idx} className="tk-glass p-6 rounded-3xl flex flex-col items-center text-center tk-anim-5 relative overflow-hidden" style={{ animationDelay: `${0.1 * idx}s` }}>
                                    <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 shadow-md border-2 border-white/50">
                                        <ProductImage type={prod.type} alt={prod.type} className="object-cover" />
                                    </div>
                                    <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-1">{prod.type}</p>
                                    <h3 className="text-lg font-display text-primary mb-3">{prod.formula}</h3>
                                    <p className="text-sm text-muted leading-relaxed">{prod.description}</p>
                                </div>
                            ))}
                        </div>

                        <Link href="/what-if" className="block mt-10">
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sage/20 via-lavender/30 to-sage/20 p-8 text-center transition-all hover:scale-[1.01] hover:shadow-lg border border-white/40 cursor-pointer tk-anim-6">
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
                                <div className="relative z-10 flex flex-col items-center justify-center">
                                    <Sparkles size={32} strokeWidth={2} className="text-sage mb-4" />
                                    <h3 className="text-2xl lg:text-3xl font-display text-primary mb-2">Curious about your progress?</h3>
                                    <p className="text-muted mb-4 max-w-md mx-auto">See how these recommendations could transform your skin over the next 6 months.</p>
                                    <span className="inline-block bg-white px-6 py-3 rounded-full text-sm font-medium text-primary shadow-sm hover:bg-sage/10 transition-colors">
                                        Try the What-If Simulator
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Sticky Mobile Capture CTA */}
            <div className="md:hidden fixed bottom-6 right-6 z-40">
                <Link
                    href="/capture"
                    className="flex items-center gap-2 bg-primary text-white text-xs font-semibold px-5 py-3 rounded-full shadow-2xl hover:bg-primary/90 transition-transform active:scale-95 border border-white/20"
                >
                    <Camera size={16} />
                    <span>Log Today&apos;s Skin</span>
                </Link>
            </div>
        </div>
    );
}