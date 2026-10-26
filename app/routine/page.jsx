import { getLatestData } from "@/app/lib/actions";
import { getActivePlan } from "@/app/lib/plan-actions";
import PageHeader from "@/app/components/ui/PageHeader";
import RoutineChecklist from "@/app/dashboard/RoutineChecklist";
import PlanHeader from "@/app/plan/PlanHeader";
import PlanTimeline from "@/app/plan/PlanTimeline";
import PlanAim from "@/app/plan/PlanAim";
import PickedForYou from "@/app/plan/PickedForYou";
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

export default async function RoutinePage({ searchParams }) {
    const { tab } = await searchParams;
    const { user, latestSelfie, latestAnalyzedSelfie, todayRoutineLog } = await getLatestData(null, { selfieLimit: 1 });

    const source = latestAnalyzedSelfie || latestSelfie || {};
    const { amRoutine, pmRoutine, facialWorkout } = source;

    // Never throws: a failed load just means "no plan to show yet", and the
    // builder below retries it.
    const planRes = await getActivePlan();
    const plan = planRes?.success ? planRes.plan : null;

    // Only picks made for this person count; there is no generic starter list here.
    const products = Array.isArray(latestSelfie?.recommendedProducts) ? latestSelfie.recommendedProducts : [];
    const routineProps = {
        completedAm: todayRoutineLog?.amCompleted || [],
        completedPm: todayRoutineLog?.pmCompleted || [],
        initialTab: tab === "pm" ? "pm" : tab === "am" ? "am" : null,
        products,
        facialWorkout: facialWorkout || "",
        workoutDone: Boolean(todayRoutineLog?.workoutDone),
    };

    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10">
            <PageHeader title="Plan" subtitle="Morning and evening steps, adjusted at every check-in." />

            {plan ? (
                <div className="flex flex-col gap-4">
                    {!user?.skinProfile?.concerns?.length && <ProfileUpdateBanner />}
                    {plan.needsRatings && <RatingsForm plan={plan} title="Your scan is in. How does your skin feel?" cta="Save my ratings" />}
                    {plan.pendingReview && !plan.needsRatings && <CheckInReview />}
                    {plan.expired && <NextPlanCard />}
                    <PlanHeader plan={plan} />
                    {!plan.expired && plan.nextCheckIn?.isDue && <CheckInCard plan={plan} />}
                    <RoutineChecklist amRoutine={plan.steps.am} pmRoutine={plan.steps.pm} newStepIds={plan.newStepIds} {...routineProps} />
                    <PlanTimeline plan={plan} />
                    <PlanAim progress={plan.progress} />
                    <PickedForYou products={products} />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <PlanBuilder />
                    <RoutineChecklist amRoutine={amRoutine} pmRoutine={pmRoutine} {...routineProps} />
                    <PickedForYou products={products} />
                </div>
            )}
        </div>
    );
}
