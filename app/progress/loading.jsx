export default function ProgressLoading() {
    const block = "bg-blush animate-pulse";
    return (
        <div className="tk-container pt-1 sm:pt-4 pb-10" aria-busy="true" aria-label="Loading your progress">
            <div className="mb-5 space-y-2">
                <div className={`h-3 w-24 rounded-full ${block}`}></div>
                <div className={`h-9 w-36 rounded-xl ${block}`}></div>
            </div>
            <div className="flex flex-col gap-4">
                <div className="tk-card p-5">
                    <div className={`h-52 w-full rounded-2xl ${block}`}></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className={`h-24 rounded-2xl ${block}`}></div>
                    <div className={`h-24 rounded-2xl ${block}`}></div>
                </div>
            </div>
        </div>
    );
}
