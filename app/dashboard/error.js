"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-5">
      <div className="tk-card p-8 md:p-12 flex flex-col items-center text-center max-w-lg w-full tk-anim-1">
        <div className="tk-icon-circle w-16 h-16 mb-6 bg-danger-soft text-danger tk-anim-2">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold text-primary mb-3 tk-anim-3">
          Dashboard Unavailable
        </h1>

        <p className="text-muted leading-relaxed mb-7 tk-anim-4">
          We couldn&apos;t load your dashboard. Your skin data may be temporarily unavailable due to a connection issue.
        </p>

        <button
          onClick={() => reset()}
          className="tk-pill-btn tk-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 tk-anim-5"
        >
          <RotateCcw className="w-4 h-4" /> Try Loading Again
        </button>
      </div>
    </div>
  );
}
