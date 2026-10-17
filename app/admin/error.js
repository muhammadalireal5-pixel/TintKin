"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ShieldX, RotateCcw } from "lucide-react";

export default function AdminError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] p-5">
      <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="tk-icon-circle w-20 h-20 bg-danger-soft text-danger mb-8 tk-anim-2 tk-anim-float">
          <ShieldX className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4 tk-anim-3">
          Admin Error
        </h1>
        
        <p className="text-muted leading-relaxed mb-8 tk-anim-4">
          The admin panel encountered an error loading data from the database or authentication provider.
        </p>
        
        <button 
          onClick={() => reset()} 
          className="tk-pill-btn tk-btn-primary w-full gap-2 tk-anim-5"
        >
          <RotateCcw className="w-4 h-4" /> Try Loading Again
        </button>
      </div>
    </div>
  );
}
