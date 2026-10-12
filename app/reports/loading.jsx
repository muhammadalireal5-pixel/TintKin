export default function ReportsLoading() {
    return (
        <div className="min-h-[calc(100vh-80px)] bg-base py-6 sm:py-12 px-4 sm:px-6 lg:px-12">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4 animate-pulse">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-lavender/40" />
                    <div className="min-w-0 space-y-2">
                        <div className="h-3 w-40 bg-lavender/40 rounded-full" />
                        <div className="h-9 w-56 bg-lavender/50 rounded-xl" />
                    </div>
                </div>

                <div className="tk-card p-5 sm:p-6 mb-8 animate-pulse">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sage/15 shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-5 w-48 bg-lavender/40 rounded-lg" />
                            <div className="h-3 w-full bg-lavender/20 rounded-full" />
                            <div className="h-3 w-3/4 bg-lavender/20 rounded-full" />
                        </div>
                    </div>
                </div>

                <div className="h-5 w-32 bg-lavender/40 rounded-full mb-3 animate-pulse" />
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="tk-card p-6 rounded-3xl h-32 animate-pulse bg-lavender/10" />
                    ))}
                </div>
            </div>
        </div>
    );
}
