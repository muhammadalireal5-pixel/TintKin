import Link from "next/link";
import { Dumbbell, Sparkles, ArrowRight, ShoppingBag } from "lucide-react";
import { getLatestData } from "@/app/lib/actions";
import { getActivePlan } from "@/app/lib/plan-actions";
import PageHeader from "@/app/components/ui/PageHeader";
import RoutineChecklist from "@/app/dashboard/RoutineChecklist";
import ProductGuideCard from "@/app/dashboard/ProductGuideCard";
import PlanHeader from "@/app/plan/PlanHeader";
import PlanProgress from "@/app/plan/PlanProgress";
import PlanTimeline from "@/app/plan/PlanTimeline";
import CheckInCard from "@/app/plan/CheckInCard";
import CheckInReview from "@/app/plan/CheckInReview";
import RatingsForm from "@/app/plan/RatingsForm";
import PlanBuilder from "@/app/plan/PlanBuilder";
import NextPlanCard from "@/app/plan/NextPlanCard";
import ProfileUpdateBanner from "@/app/dashboard/ProfileUpdateBanner";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Your Plan",
    description: "Your personalised 30-day skin plan: morning and evening steps, check-ins, progress and product picks.",
    robots: { index: false, follow: false },
};

const STARTER_PRODUCTS = [
    { type: "Cleanser", formula: "Gentle Hydrating Cleanser", description: "Mild cleanser that maintains your skin barrier." },
    { type: "Serum", formula: "Vitamin C + Niacinamide", description: "Brightens tone and fades dark spots." },
    { type: "Moisturizer", formula: "Ceramide Cream", description: "Locks in moisture and strengthens barrier." },
];

export default async function RoutinePage({ searchParams }) {
    const { tab } = await searchParams;
    const { user, latestSelfie, latestAnalyzedSelfie, todayRoutineLog } = await getLatestData(null, { selfieLimit: 1 });

    const source = latestAnalyzedSelfie || latestSelfie || {};
    const { amRoutine, pmRoutine, facialWorkout } = source;

    // Never throws: a failed load just means "no plan to show yet", and the
    // builder below retries it.
    const planRes = await getActivePlan();
    const plan = planRes?.success ? planRes.plan : null;

    const hasPersonalized = Array.isArray(latestSelfie?.recommendedProducts) && latestSelfie.recommendedProducts.length > 0;
    const products = hasPersonalized ? latestSelfie.recommendedProducts : STARTER_PRODUCTS;

    const [workoutTitle, ...workoutRest] = (facialWorkout || "").split(":");
    const hasWorkoutDetail = facialWorkout && facialWorkout.includes(":");

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <PageHeader
                eyebrow={plan ? `Day ${plan.day} of ${plan.durationDays}` : "Your plan for today"}
                title="Plan"
                subtitle="Morning and evening steps built around your skin, adjusted at every check-in."
            />

            {plan ? (
                <div className="flex flex-col gap-4">
                    {!user?.skinProfile?.concerns?.length && <ProfileUpdateBanner />}
                    {plan.needsRatings && <RatingsForm plan={plan} title="Your scan is in. How does your skin feel?" cta="Save my ratings" />}
                    {plan.pendingReview && !plan.needsRatings && <CheckInReview />}
                    {plan.expired && <NextPlanCard />}
                    <PlanHeader plan={plan} />
                    {!plan.expired && <CheckInCard plan={plan} />}
                    <RoutineChecklist
                        amRoutine={plan.steps.am}
                        pmRoutine={plan.steps.pm}
                        completedAm={todayRoutineLog?.amCompleted || []}
                        completedPm={todayRoutineLog?.pmCompleted || []}
                        initialTab={tab === "pm" ? "pm" : "am"}
                        newStepIds={plan.newStepIds}
                    />
                    <PlanProgress progress={plan.progress} />
                    <PlanTimeline plan={plan} />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <PlanBuilder />
                    <RoutineChecklist
                        amRoutine={amRoutine}
                        pmRoutine={pmRoutine}
                        completedAm={todayRoutineLog?.amCompleted || []}
                        completedPm={todayRoutineLog?.pmCompleted || []}
                        initialTab={tab === "pm" ? "pm" : "am"}
                    />
                </div>
            )}

            <section id="workout" className="tk-card p-5 sm:p-6 mt-4 scroll-mt-20">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-primary mb-3">
                    <span className="tk-icon-circle w-8 h-8"><Dumbbell size={16} /></span>
                    Targeted Facial Workout
                </h2>
                {facialWorkout ? (
                    <div className="rounded-2xl bg-blush/70 p-4 sm:p-5">
                        {hasWorkoutDetail ? (
                            <>
                                <p className="text-base font-semibold text-primary mb-1.5">{workoutTitle.trim()}</p>
                                <p className="text-sm text-muted leading-relaxed">{workoutRest.join(":").trim()}</p>
                            </>
                        ) : (
                            <p className="text-sm text-primary leading-relaxed">{facialWorkout}</p>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted rounded-2xl bg-blush/50 p-4 text-center">
                        Optional: add a progress scan to get a facial workout matched to your skin.{" "}
                        <Link href="/capture" className="font-semibold text-accent hover:text-accent-deep">Add a scan</Link>
                    </p>
                )}
            </section>

            <section id="products" className="mt-8 scroll-mt-20">
                <div className="flex items-end justify-between gap-3 mb-1">
                    <h2 className="text-xl font-semibold text-primary">
                        {hasPersonalized ? "Recommended products" : "Starter kit"}
                    </h2>
                    <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-deep">
                        <ShoppingBag size={15} /> Shop
                    </Link>
                </div>
                <p className="text-sm text-muted mb-4">
                    {hasPersonalized
                        ? "Your routine for 30 days (consider a 1-month supply)."
                        : "A general starting routine — add a progress scan to get picks personalised to your results."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.map((prod, idx) => (
                        <ProductGuideCard
                            key={idx}
                            type={prod.type}
                            formula={prod.formula}
                            description={prod.description}
                        />
                    ))}
                </div>
            </section>

            <Link
                href="/what-if"
                className="tk-card mt-8 flex items-center gap-4 p-5 sm:p-6 bg-gradient-to-r from-accent-soft/70 to-surface hover:border-accent/40 transition-colors"
            >
                <span className="tk-icon-circle w-12 h-12 bg-paper"><Sparkles size={22} /></span>
                <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold text-primary">Curious how these could change your skin?</span>
                    <span className="block text-sm text-muted mt-0.5">See a 6-month preview in the What-If simulator.</span>
                </span>
                <ArrowRight size={18} className="text-accent shrink-0" />
            </Link>
        </div>
    );
}
