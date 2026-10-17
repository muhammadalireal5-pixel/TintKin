"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] p-5">
      <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="tk-icon-circle w-20 h-20 bg-danger-soft text-danger mb-8 tk-anim-2 tk-anim-float">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4 tk-anim-3">
          Something unexpected happened.
        </h1>
        
        <p className="text-muted leading-relaxed mb-8 tk-anim-4">
          Don&apos;t worry — your data is safe. We encountered a technical issue while loading this page.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full tk-anim-5">
          <button 
            onClick={() => reset()} 
            className="tk-pill-btn tk-btn-primary flex-1 gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
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
