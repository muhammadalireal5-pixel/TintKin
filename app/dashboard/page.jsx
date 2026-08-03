import { getLatestData } from "@/app/lib/actions";
import { redirect } from "next/navigation";
import RadarChartClient from "./RadarChartClient";
import ProgressChart from "./ProgressChart";
import ScoreCarousel from "./ScoreCarousel";
import Link from "next/link";
import Image from "next/image";
import ProductImage from "./ProductImage";

export default async function DashboardPage() {
    const { user, latestSelfie, allSelfies, realAge } = await getLatestData();
    if (!latestSelfie) redirect("/capture");
    
    // Ensure user has completed onboarding
    if (!user.onboardingComplete) redirect("/onboarding");

    const { overallScore, skinAge, scores, critique, habits, facialWorkout } = latestSelfie;
    const skinOlder = skinAge > realAge;
    const ageDelta = Math.abs(skinAge - realAge);

    const products = (latestSelfie?.recommendedProducts && latestSelfie.recommendedProducts.length > 0)
        ? latestSelfie.recommendedProducts
        : [
            {
                type: "Cleanser",
                formula: "Gentle Hydrating Cleanser",
                description: "Mild cleanser that maintains your skin barrier.",
            },
            {
                type: "Serum",
                formula: "Vitamin C + Niacinamide",
                description: "Brightens tone and fades dark spots.",
            },
            {
                type: "Moisturizer",
                formula: "Ceramide Cream",
                description: "Locks in moisture and strengthens barrier.",
            },
        ];

    return (
        <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-12 px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
                
                {/* Page Title */}
                <div className="mb-12 tk-anim-1">
                    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted mb-2">
                        Your Skin Journal
                    </p>
                    <h1 className="text-4xl lg:text-5xl font-display font-medium text-primary">
                        Today's <span className="italic text-sage">Insight</span>
                    </h1>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    
                    {/* Overall Score (Large spanning card) */}
                    <div className="tk-glass p-8 md:col-span-2 lg:col-span-2 flex flex-col justify-between tk-anim-2">
                        <div>
                            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Overall Harmony</p>
                            <p className="text-sm text-primary mb-6">Your skin's overall balance and vitality today.</p>
                        </div>
                        <div className="flex items-end gap-4">
                            <h2 className="text-6xl lg:text-8xl font-display font-medium text-primary leading-none">
                                {overallScore}
                            </h2>
                            <span className="text-xl text-muted mb-2">/ 100</span>
                        </div>
                        <div className="mt-8 pt-6 border-t border-solid">
                            <p className="text-sm text-muted">
                                {critique || (overallScore >= 80 ? 'Beautifully balanced. Keep nurturing it.' : overallScore >= 60 ? 'A steady glow. Small tweaks can help.' : 'Take a moment for some extra care today.')}
                            </p>
                        </div>
                    </div>

                    {/* Age Comparison (Stacked cards) */}
                    <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-1 tk-anim-3">
                        <div className="tk-glass p-6 flex-1 flex flex-col justify-center">
                            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Real Age</p>
                            <p className="text-4xl font-display text-primary">{realAge}</p>
                        </div>
                        
                        <div className={`tk-glass p-6 flex-1 flex flex-col justify-center border ${skinOlder ? 'border-sage/30' : 'border-lavender/40'}`}>
                            <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Skin Age</p>
                            <div className="flex items-baseline gap-3">
                                <p className="text-4xl font-display text-primary">{skinAge}</p>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${skinOlder ? 'bg-sage/15 text-sage' : 'bg-lavender/50 text-[#792CA2]'}`}>
                                    {skinOlder ? `+${ageDelta}` : `-${ageDelta}`} yrs
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart (Large spanning card) */}
                    <div className="tk-glass p-8 md:col-span-3 lg:col-span-1 min-h-[300px] flex flex-col tk-anim-4">
                        <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-6">Profile Radar</p>
                        <div className="flex-1 w-full relative">
                            <RadarChartClient scores={scores} />
                        </div>
                    </div>

                    {/* Progress Chart (New) */}
                    <div className="tk-glass p-8 md:col-span-4 lg:col-span-4 min-h-[400px] flex flex-col tk-anim-5">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-2">Journey</p>
                                <p className="text-sm text-primary">Your progress over time.</p>
                            </div>
                        </div>
                        <div className="flex-1 w-full relative">
                            <ProgressChart allSelfies={allSelfies} />
                        </div>
                    </div>

                    {/* AI Recommendations */}
                    <div className="tk-glass p-8 md:col-span-2 lg:col-span-2 flex flex-col tk-anim-6">
                         <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">Recommended Habits</p>
                         <ul className="space-y-4">
                             {habits && habits.length > 0 ? (
                                 habits.map((habit, idx) => (
                                     <li key={idx} className="flex items-start gap-3">
                                         <span className="text-sage mt-1">
                                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                         </span>
                                         <span className="text-primary text-sm">{habit}</span>
                                     </li>
                                 ))
                             ) : (
                                 <li className="text-muted text-sm italic">Analyze a new selfie to get personalized habits based on your goals.</li>
                             )}
                         </ul>
                    </div>

                    <div className="tk-glass p-8 md:col-span-2 lg:col-span-2 flex flex-col tk-anim-6" style={{ animationDelay: '0.1s' }}>
                         <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">Targeted Facial Workout</p>
                         {facialWorkout ? (
                             <div className="bg-sage/10 p-5 rounded-xl border border-sage/20">
                                 <p className="text-sm text-primary leading-relaxed">{facialWorkout}</p>
                             </div>
                         ) : (
                             <div className="bg-white/50 p-5 rounded-xl border border-lavender/50 text-center text-muted text-sm italic">
                                 Analyze a new selfie to get a personalized facial workout.
                             </div>
                         )}
                    </div>

                    {/* Metric Details (Swipeable Carousel) */}
                    <ScoreCarousel scores={scores} />
                    
                    {/* AI Product Recommendations & What-If Bridge */}
                    <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-4 space-y-6 animate-fade-in">
                        <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-4">Recommended Products</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.map((prod, idx) => (
                                <div key={idx} className="tk-glass p-6 rounded-3xl flex flex-col items-center text-center tk-anim-5" style={{ animationDelay: `${0.1 * idx}s` }}>
                                    <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 shadow-md border-2 border-white/50">
                                    <ProductImage type={prod.type} alt={prod.type} className="object-cover" />
                                    </div>
                                    <p className="text-xs font-semibold tracking-widest uppercase text-muted mb-1">{prod.type}</p>
                                    <h3 className="text-lg font-display text-primary mb-3">{prod.formula}</h3>
                                    <p className="text-sm text-muted leading-relaxed">{prod.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* What-If Banner */}
                        <Link href="/what-if" className="block mt-10">
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sage/20 via-lavender/30 to-sage/20 p-8 text-center transition-all hover:scale-[1.01] hover:shadow-lg border border-white/40 cursor-pointer tk-anim-6">
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
                                <div className="relative z-10 flex flex-col items-center justify-center">
                                    <span className="text-3xl mb-4">✨</span>
                                    <h3 className="text-2xl lg:text-3xl font-display text-primary mb-2">Curious about your progress?</h3>
                                    <p className="text-muted mb-4 max-w-md mx-auto">Wanna see how improved these recommendations will make you look in 6 months?</p>
                                    <span className="inline-block bg-white px-6 py-3 rounded-full text-sm font-medium text-primary shadow-sm hover:bg-sage/10 transition-colors">
                                        Try the What-If Simulator
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}