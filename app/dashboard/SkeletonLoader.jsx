export function SkeletonCard({ className = "" }) {
    return (
        <div className={`tk-glass p-6 rounded-3xl animate-pulse ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="h-3 w-24 bg-lavender/50 rounded-full"></div>
                <div className="h-6 w-16 bg-lavender/40 rounded-full"></div>
            </div>
            <div className="space-y-3">
                <div className="h-8 w-3/4 bg-lavender/60 rounded-lg"></div>
                <div className="h-4 w-full bg-lavender/40 rounded"></div>
                <div className="h-4 w-2/3 bg-lavender/40 rounded"></div>
            </div>
        </div>
    );
}

export function SkeletonRadar() {
    return (
        <div className="tk-glass p-6 rounded-3xl animate-pulse">
            <div className="h-4 w-32 bg-lavender/50 rounded-full mb-6"></div>
            <div className="w-full aspect-square bg-lavender/30 rounded-full flex items-center justify-center">
                <div className="w-3/4 h-3/4 bg-lavender/40 rounded-full"></div>
            </div>
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="tk-glass p-8 rounded-3xl animate-pulse min-h-[400px]">
            <div className="flex justify-between items-end mb-6">
                <div className="space-y-2">
                    <div className="h-3 w-24 bg-lavender/50 rounded-full"></div>
                    <div className="h-4 w-48 bg-lavender/40 rounded"></div>
                </div>
            </div>
            <div className="w-full h-64 bg-lavender/30 rounded-xl"></div>
        </div>
    );
}

export function SkeletonRoutine() {
    return (
        <div className="tk-glass p-8 rounded-3xl animate-pulse md:col-span-3 lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-lavender/50 rounded-xl"></div>
                <div className="h-4 w-48 bg-lavender/40 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white/50 p-4 rounded-2xl">
                        <div className="h-4 w-3/4 bg-lavender/50 rounded mb-2"></div>
                        <div className="h-3 w-full bg-lavender/30 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonTrophy() {
    return (
        <div className="tk-glass p-6 rounded-3xl animate-pulse col-span-1 md:col-span-3 lg:col-span-4">
            <div className="h-5 w-40 bg-lavender/50 rounded-full mb-4"></div>
            <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-16 h-16 bg-lavender/40 rounded-2xl shrink-0"></div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonScoreCard() {
    return (
        <div className="tk-glass p-7 rounded-3xl animate-pulse md:col-span-2 lg:col-span-2">
            <div className="flex justify-between items-start mb-4">
                <div className="h-3 w-32 bg-lavender/50 rounded-full"></div>
                <div className="flex gap-2">
                    <div className="h-6 w-20 bg-lavender/40 rounded-full"></div>
                    <div className="h-6 w-16 bg-lavender/40 rounded-full"></div>
                </div>
            </div>
            <div className="h-4 w-full bg-lavender/40 rounded mb-6"></div>
            <div className="flex gap-8">
                <div className="space-y-2">
                    <div className="h-3 w-16 bg-lavender/50 rounded"></div>
                    <div className="h-12 w-24 bg-lavender/60 rounded"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-24 bg-lavender/50 rounded"></div>
                    <div className="h-12 w-32 bg-lavender/60 rounded"></div>
                </div>
            </div>
        </div>
    );
}
