import { redirect } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Sparkles, ArrowRight, ShoppingBag } from "lucide-react";
import { getLatestData } from "@/app/lib/actions";
import PageHeader from "@/app/components/ui/PageHeader";
import RoutineChecklist from "@/app/dashboard/RoutineChecklist";
import ProductGuideCard from "@/app/dashboard/ProductGuideCard";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Your Routine",
    description: "Your personalised morning and evening skincare routine, facial workout and product picks.",
    robots: { index: false, follow: false },
};

const STARTER_PRODUCTS = [
    { type: "Cleanser", formula: "Gentle Hydrating Cleanser", description: "Mild cleanser that maintains your skin barrier." },
    { type: "Serum", formula: "Vitamin C + Niacinamide", description: "Brightens tone and fades dark spots." },
    { type: "Moisturizer", formula: "Ceramide Cream", description: "Locks in moisture and strengthens barrier." },
];

export default async function RoutinePage({ searchParams }) {
    const { tab } = await searchParams;
    const { latestSelfie, latestAnalyzedSelfie, todayRoutineLog } = await getLatestData(null, { selfieLimit: 1 });
    if (!latestSelfie) redirect("/capture");

    const source = latestAnalyzedSelfie || latestSelfie;
    const { amRoutine, pmRoutine, facialWorkout } = source;

    const hasPersonalized = Array.isArray(latestSelfie.recommendedProducts) && latestSelfie.recommendedProducts.length > 0;
    const products = hasPersonalized ? latestSelfie.recommendedProducts : STARTER_PRODUCTS;

    const [workoutTitle, ...workoutRest] = (facialWorkout || "").split(":");
    const hasWorkoutDetail = facialWorkout && facialWorkout.includes(":");

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <PageHeader
                eyebrow="Your plan for today"
                title="Routine"
                subtitle="Morning and evening steps tailored to your latest scan."
            />

            <RoutineChecklist
                amRoutine={amRoutine}
                pmRoutine={pmRoutine}
                completedAm={todayRoutineLog?.amCompleted || []}
                completedPm={todayRoutineLog?.pmCompleted || []}
                initialTab={tab === "pm" ? "pm" : "am"}
            />

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
                        Analyze a new selfie to get a personalised facial workout.
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
                        : "A general starting routine — scan again to get picks personalised to your results."}
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
                <span className="tk-icon-circle w-12 h-12 bg-white"><Sparkles size={22} /></span>
                <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold text-primary">Curious how these could change your skin?</span>
                    <span className="block text-sm text-muted mt-0.5">See a 6-month preview in the What-If simulator.</span>
                </span>
                <ArrowRight size={18} className="text-accent shrink-0" />
            </Link>
        </div>
    );
}
