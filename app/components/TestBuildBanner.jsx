"use client";

import { useState, useSyncExternalStore } from "react";
import { FlaskConical, X } from "lucide-react";

const DISMISS_KEY = "tk-test-build-notice-dismissed";
const emptySubscribe = () => () => {};

// Matches the useMounted/useIsMobile pattern in AnimatedModal.jsx: reading
// localStorage can't happen during SSR, and setting state directly in an
// effect to sync it in would risk a hydration mismatch (server always
// renders the banner, since it has no way to know a past dismissal).
function useStoredDismissed() {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );
}

export default function TestBuildBanner() {
  const storedDismissed = useStoredDismissed();
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  if (storedDismissed || dismissedThisSession) return null;

  const handleDismiss = () => {
    setDismissedThisSession(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Nothing to persist to — it'll just show again next visit.
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs sm:text-sm leading-snug">
          <FlaskConical size={14} className="shrink-0" />
          <span><strong className="font-semibold">Test build:</strong> TintKin is in closed testing — please don&apos;t upload real personal photos yet.</span>
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss test build notice"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
