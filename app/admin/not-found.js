import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="tk-glass p-10 md:p-14 rounded-3xl flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-[var(--tk-accent-lavender)] mb-8 tk-anim-2 tk-anim-float" style={{ background: 'var(--tk-text-primary)' }}>
          <ShieldAlert className="w-12 h-12 opacity-50" />
        </div>
        
        <h1 className="font-display text-3xl md:text-4xl font-medium text-primary mb-4 tk-anim-3">
          Admin Resource Not Found
        </h1>
        
        <p className="text-muted leading-relaxed mb-10 tk-anim-4">
          The requested admin view or resource could not be found.
        </p>
        
        <div className="flex w-full tk-anim-5">
          <Link 
            href="/admin" 
            className="tk-btn-primary w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
