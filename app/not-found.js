import Link from "next/link";
import { SearchX, Home, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] tk-mesh-bg p-6">
      <div className="tk-glass p-10 md:p-14 rounded-3xl flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-[var(--tk-accent-lavender)] mb-8 tk-anim-2 tk-anim-float" style={{ background: 'var(--tk-text-primary)' }}>
          <SearchX className="w-12 h-12" />
        </div>
        
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[var(--tk-accent-lavender)] text-[var(--tk-text-primary)] text-sm font-medium mb-6 tk-anim-3">
          404 Error
        </div>
        
        <h1 className="font-display text-4xl md:text-5xl font-medium text-primary mb-4 tk-anim-4">
          Page Not Found
        </h1>
        
        <p className="text-muted leading-relaxed mb-10 tk-anim-5">
          This page isn't in your journal yet. It might have been moved or the URL could be incorrect.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full tk-anim-5">
          <Link 
            href="/dashboard" 
            className="tk-btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link 
            href="/" 
            className="tk-btn-ghost flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
