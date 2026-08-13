"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function WhatIfError({ error, unstable_retry }) {
  useEffect(() => {
    console.error("What-If Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
      <div className="tk-glass p-10 md:p-14 rounded-3xl flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center text-red-500 mb-8 tk-anim-2 tk-anim-float">
          <AlertCircle className="w-10 h-10" />
        </div>
        
        <h1 className="font-display text-3xl md:text-4xl font-medium text-primary mb-4 tk-anim-3">
          Simulation Failed
        </h1>
        
        <p className="text-muted leading-relaxed mb-8 tk-anim-4">
          The What-If simulator encountered an error. The prediction engine may be temporarily unavailable.
        </p>
        
        <button 
          onClick={() => unstable_retry()} 
          className="tk-btn-primary w-full flex items-center justify-center gap-2 tk-anim-5"
        >
          <RotateCcw className="w-4 h-4" /> Try Simulation Again
        </button>
      </div>
    </div>
  );
}
