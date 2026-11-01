export default function AdminLoading() {
  const block = "bg-blush animate-pulse";
  return (
    <div className="min-h-screen bg-base px-4 sm:px-8 py-6 lg:pl-[15.5rem]" aria-busy="true" aria-label="Loading admin">
      {[0, 1, 2].map((s) => (
        <div key={s} className="mt-8 first:mt-2">
          <div className={`h-6 w-40 rounded ${block}`} />
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className={`h-20 rounded-lg ${block}`} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
