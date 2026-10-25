export default function PlanLoading() {
    const block = "bg-blush animate-pulse";
    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10" aria-busy="true" aria-label="Loading your plan">
            <div className="mb-5 space-y-2">
                <div className={`h-3 w-24 rounded-full ${block}`}></div>
                <div className={`h-9 w-24 rounded-xl ${block}`}></div>
                <div className={`h-3 w-64 max-w-full rounded-full ${block}`}></div>
            </div>
            <div className="flex flex-col gap-4">
                <div className="tk-card p-5 space-y-3">
                    <div className={`h-3 w-28 rounded-full ${block}`}></div>
                    <div className={`h-8 w-40 rounded-xl ${block}`}></div>
                    <div className={`h-2 w-full rounded-full ${block}`}></div>
                    <div className={`h-3 w-full rounded-full ${block}`}></div>
                </div>
                <div className="tk-card p-5 flex items-center gap-4">
                    <div className={`w-[4.5rem] h-[4.5rem] rounded-full ${block}`}></div>
                    <div className="flex-1 space-y-2">
                        <div className={`h-4 w-28 rounded-full ${block}`}></div>
                        <div className={`h-3 w-40 rounded-full ${block}`}></div>
                    </div>
                </div>
                <div className={`h-12 rounded-full ${block}`}></div>
                <div className="tk-card p-5 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full ${block}`}></div>
                            <div className={`h-4 flex-1 rounded-full ${block}`}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
