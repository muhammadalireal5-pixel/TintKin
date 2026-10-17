import Link from "next/link";
import { SearchX, Home, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] p-5">
      <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="tk-icon-circle w-24 h-24 bg-accent-soft text-accent mb-8 tk-anim-2 tk-anim-float">
          <SearchX className="w-12 h-12" />
        </div>
        
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-accent-soft text-accent-deep text-sm font-medium mb-6 tk-anim-3">
          404 Error
        </div>
        
        <h1 className="text-4xl md:text-5xl font-semibold text-primary mb-4 tk-anim-4">
          Page Not Found
        </h1>
        
        <p className="text-muted leading-relaxed mb-10 tk-anim-5">
          This page isn&apos;t in your journal yet. It might have been moved or the URL could be incorrect.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full tk-anim-5">
          <Link 
            href="/dashboard" 
            className="tk-pill-btn tk-btn-primary flex-1 gap-2"
          >
            <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link 
            href="/" 
            className="tk-pill-btn tk-btn-ghost flex-1 gap-2"
          >
            <Home className="w-4 h-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
