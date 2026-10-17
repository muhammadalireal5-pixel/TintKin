export default function ReportsLoading() {
    return (
        <div className="tk-container py-6 sm:py-10">
            <div className="mb-5 sm:mb-7 space-y-2 animate-pulse">
                <div className="h-3 w-40 bg-blush rounded-full" />
                <div className="h-9 w-56 bg-blush rounded-xl" />
            </div>

            <div className="tk-card p-5 sm:p-6 mb-8 animate-pulse">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-accent-soft shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-5 w-48 bg-blush rounded-lg" />
                        <div className="h-3 w-full bg-blush/70 rounded-full" />
                        <div className="h-3 w-3/4 bg-blush/70 rounded-full" />
                    </div>
                </div>
            </div>

            <div className="h-5 w-32 bg-blush rounded-full mb-3 animate-pulse" />
            <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="tk-card h-32 animate-pulse" />
                ))}
            </div>
        </div>
    );
}
