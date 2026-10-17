export default function DashboardLoading() {
    const block = "bg-blush animate-pulse";
    return (
        <div className="w-full pb-6" aria-busy="true" aria-label="Loading your dashboard">
            {/* Greeting */}
            <div className="mb-4 space-y-2">
                <div className={`h-3 w-28 rounded-full ${block}`}></div>
                <div className={`h-9 w-52 rounded-xl ${block}`}></div>
                <div className={`h-3 w-64 max-w-full rounded-full ${block}`}></div>
            </div>

            {/* Segmented control */}
            <div className="tk-segmented mb-4 pointer-events-none">
                <div className={`h-9 flex-1 rounded-full ${block}`}></div>
                <div className="h-9 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="lg:col-span-3 flex flex-col gap-3 sm:gap-4">
                    {/* Score card with photo block */}
                    <div className="tk-card p-4 sm:p-5">
                        <div className="flex items-stretch gap-4">
                            <div className="flex-1 space-y-3">
                                <div className={`h-3 w-20 rounded-full ${block}`}></div>
                                <div className={`h-14 w-32 rounded-xl ${block}`}></div>
                                <div className={`h-5 w-24 rounded-full ${block}`}></div>
                            </div>
                            <div className={`w-32 sm:w-48 h-32 sm:h-40 rounded-2xl ${block}`}></div>
                        </div>
                        {/* 4 metric cells */}
                        <div className="grid grid-cols-4 gap-2 mt-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="rounded-xl bg-blush/50 p-2.5 space-y-2">
                                    <div className={`h-2.5 w-full rounded-full ${block}`}></div>
                                    <div className={`h-5 w-8 rounded-lg ${block}`}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Focus card */}
                    <div className="tk-card p-4 flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full shrink-0 ${block}`}></div>
                        <div className="flex-1 space-y-2">
                            <div className={`h-4 w-32 rounded-full ${block}`}></div>
                            <div className={`h-3 w-full rounded-full ${block}`}></div>
                        </div>
                    </div>
                </div>

                {/* Plan tiles */}
                <div className="lg:col-span-2 tk-card p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className={`h-4 w-28 rounded-full ${block}`}></div>
                        <div className={`h-3 w-20 rounded-full ${block}`}></div>
                    </div>
                    <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="tk-tile p-3 flex flex-col items-center gap-2">
                                <div className={`w-9 h-9 rounded-full ${block}`}></div>
                                <div className={`h-2.5 w-12 rounded-full ${block}`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
