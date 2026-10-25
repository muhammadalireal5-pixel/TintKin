export default function DashboardLoading() {
    const block = "bg-blush animate-pulse";
    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10" aria-busy="true" aria-label="Loading your dashboard">
            <div className="flex flex-col gap-4 lg:max-w-2xl">
                {/* Greeting, photo and streak chip */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className={`h-3 w-24 rounded-full ${block}`}></div>
                        <div className={`h-9 w-44 rounded-xl ${block}`}></div>
                    </div>
                    <div className={`w-16 h-16 rounded-full ${block}`}></div>
                </div>
                <div className={`h-8 w-36 rounded-full ${block}`}></div>

                {/* Plan card */}
                <div className="tk-card p-4 sm:p-5 space-y-3">
                    <div className={`h-3 w-40 rounded-full ${block}`}></div>
                    <div className={`h-6 w-48 rounded-lg ${block}`}></div>
                    <div className={`h-11 w-full rounded-full ${block}`}></div>
                    <div className={`h-2 w-full rounded-full ${block}`}></div>
                    <div className={`h-2 w-full rounded-full ${block}`}></div>
                </div>

                {/* Score card and metrics */}
                <div className="tk-card p-5 space-y-3">
                    <div className={`h-3 w-20 rounded-full ${block}`}></div>
                    <div className={`h-12 w-32 rounded-xl ${block}`}></div>
                    <div className={`h-5 w-24 rounded-full ${block}`}></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="tk-tile p-3 space-y-2">
                            <div className={`h-2.5 w-full rounded-full ${block}`}></div>
                            <div className={`h-5 w-8 rounded-lg ${block}`}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
