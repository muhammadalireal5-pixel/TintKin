"use client";

import { unstable_catchError } from 'next/error';
import { AlertCircle, RotateCcw } from 'lucide-react';

function ErrorFallback(props, { error, unstable_retry }) {
  return (
    <div className="tk-glass p-6 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 my-4 w-full border border-red-500/10 bg-red-50/30">
      <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-500 mb-2">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-display text-lg font-medium text-primary mb-1">
          {props.title || "Error Loading Component"}
        </h3>
        <p className="text-muted text-sm max-w-sm mx-auto">
          {props.message || "We encountered an issue loading this section."}
        </p>
      </div>
      <button 
        onClick={() => unstable_retry()} 
        className="tk-btn-ghost mt-2 flex items-center gap-2 text-sm !py-2 !px-4 hover:bg-red-500/10 border-red-500/20"
      >
        <RotateCcw className="w-4 h-4" /> Try Again
      </button>
    </div>
  );
}

export const ComponentErrorFallback = unstable_catchError(ErrorFallback);
