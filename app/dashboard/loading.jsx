import { SkeletonRoutine, SkeletonScoreCard, SkeletonRadar, SkeletonChart, SkeletonTrophy } from "./SkeletonLoader";
import { StaggerContainer, StaggerItem } from "./StaggerReveal";

export default function DashboardLoading() {
    return (
        <div className="min-h-[calc(100vh-80px)] bg-base tk-mesh-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 space-y-2 animate-pulse">
                    <div className="h-3 w-32 bg-lavender/40 rounded-full"></div>
                    <div className="h-10 w-64 bg-lavender/50 rounded-xl"></div>
                </div>

                <StaggerContainer className="flex flex-col gap-5 sm:gap-6">
                    <StaggerItem><SkeletonRoutine /></StaggerItem>
                    <StaggerItem><SkeletonScoreCard /></StaggerItem>
                    <StaggerItem>
                        <div className="flex gap-3 overflow-hidden">
                            <div className="tk-glass shrink-0 w-[78vw] max-w-[300px] md:w-full p-4 rounded-2xl animate-pulse h-32 bg-lavender/20"></div>
                            <div className="tk-glass shrink-0 w-[78vw] max-w-[300px] md:w-full p-4 rounded-2xl animate-pulse h-32 bg-lavender/20 hidden sm:block"></div>
                            <div className="shrink-0 w-[78vw] max-w-[300px] md:w-full hidden md:block">
                                <SkeletonRadar />
                            </div>
                        </div>
                    </StaggerItem>
                    <StaggerItem><SkeletonTrophy /></StaggerItem>
                    <StaggerItem><SkeletonChart /></StaggerItem>
                </StaggerContainer>
            </div>
        </div>
    );
}
