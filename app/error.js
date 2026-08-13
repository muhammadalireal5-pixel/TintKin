"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] tk-mesh-bg p-6">
      <div className="tk-glass p-10 md:p-14 rounded-3xl flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center text-red-500 mb-8 tk-anim-2 tk-anim-float">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <h1 className="font-display text-3xl md:text-4xl font-medium text-primary mb-4 tk-anim-3">
          Something unexpected happened.
        </h1>
        
        <p className="text-muted leading-relaxed mb-8 tk-anim-4">
          Don't worry — your data is safe. We encountered a technical issue while loading this page.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full tk-anim-5">
          <button 
            onClick={() => unstable_retry()} 
            className="tk-btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
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
