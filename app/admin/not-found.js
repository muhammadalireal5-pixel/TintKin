import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] p-5">
      <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="tk-icon-circle w-24 h-24 bg-accent-soft text-accent mb-8 tk-anim-2 tk-anim-float">
          <ShieldAlert className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4 tk-anim-3">
          Admin Resource Not Found
        </h1>
        
        <p className="text-muted leading-relaxed mb-10 tk-anim-4">
          The requested admin view or resource could not be found.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full tk-anim-5">
          <Link 
            href="/admin" 
            className="tk-pill-btn tk-btn-primary flex-1 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Admin Panel
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
