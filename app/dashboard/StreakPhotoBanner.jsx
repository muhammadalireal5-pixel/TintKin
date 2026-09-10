"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export default function StreakPhotoBanner({ latestSelfie, user }) {
  const [dismissed, setDismissed] = useState(false);

  // Check if today's photo is already logged (isAnalyzed === false means it's uploaded but not yet analyzed, or it's a streak photo)
  const hasLoggedToday = latestSelfie && !latestSelfie.isAnalyzed;

  if (dismissed || !hasLoggedToday) return null;

  return (
    <div className="mb-8 p-4 bg-sage/10 border border-sage/30 rounded-2xl flex items-start justify-between gap-3 tk-anim-2 relative">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-sage shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-primary">Photo logged!</h3>
          <p className="text-sm text-muted">
            You&apos;ve successfully maintained your streak today. Your next deep analysis is coming up based on your subscription tier.
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
        aria-label="Dismiss streak banner"
      >
        <X size={15} />
      </button>
    </div>
  );
}
