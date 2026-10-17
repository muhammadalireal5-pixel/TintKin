"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function WhatIfError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-full flex-1 p-6">
      <div className="tk-card p-10 md:p-14 rounded-3xl flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="w-20 h-20 rounded-3xl bg-accent-soft flex items-center justify-center text-accent mb-8 tk-anim-2">
          <AlertCircle className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-semibold text-primary mb-4 tk-anim-3">
          Simulation Failed
        </h1>
        
        <p className="text-muted leading-relaxed mb-8 tk-anim-4">
          The What-If simulator encountered an error. The prediction engine may be temporarily unavailable.
        </p>
        
        <button 
          onClick={() => reset()} 
          className="tk-pill-btn tk-btn-primary w-full sm:w-auto tk-anim-5"
        >
          <RotateCcw className="w-4 h-4" /> Try Simulation Again
        </button>
      </div>
    </div>
  );
}
