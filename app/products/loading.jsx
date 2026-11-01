import { PageLoadingMarker } from "@/app/components/page-loading";

export default function ProductsLoading() {
    const block = "bg-blush animate-pulse";
    return (
        <>
            <PageLoadingMarker />
            <div className="tk-container pt-1 sm:pt-4 pb-10" aria-busy="true" aria-label="Loading product check">
                <div className="mb-5 space-y-2">
                    <div className={`h-9 w-48 rounded-xl ${block}`}></div>
                    <div className={`h-3 w-72 max-w-full rounded-full ${block}`}></div>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                    <div className="tk-card p-5 space-y-3">
                        <div className={`h-11 rounded-full ${block}`}></div>
                        <div className={`h-36 rounded-2xl ${block}`}></div>
                        <div className={`h-11 rounded-full ${block}`}></div>
                    </div>
                    <div className="tk-card p-5 space-y-3">
                        {[1, 2, 3].map((i) => <div key={i} className={`h-12 rounded-2xl ${block}`}></div>)}
                    </div>
                </div>
            </div>
        </>
    );
}
