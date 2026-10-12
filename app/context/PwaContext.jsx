"use client";

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from "react";

const PwaContext = createContext({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  promptInstall: async () => "unavailable",
});

export const usePwaInstall = () => useContext(PwaContext);

const emptySubscribe = () => () => {};

function detectStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

// "Installed" can flip mid-session (display-mode changes once launched
// standalone, and appinstalled fires right after the install completes),
// so this is a live subscription rather than a one-time read.
function subscribeInstalled(callback) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}
function useIsInstalled() {
  return useSyncExternalStore(subscribeInstalled, detectStandalone, () => false);
}

function detectIOS() {
  const ua = window.navigator.userAgent;
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  // iPadOS 13+ reports as a Mac UA; multi-touch is the only reliable tell.
  const isIpadOS13Plus = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return isClassicIOS || isIpadOS13Plus;
}
// Fixed for the life of the device — read once on the client, matching
// the useMounted trick this codebase already uses (see AnimatedModal).
function useIsIOS() {
  return useSyncExternalStore(emptySubscribe, detectIOS, () => false);
}

export function PwaProvider({ children }) {
  const isInstalled = useIsInstalled();
  const isIOS = useIsIOS();
  const [deferredEvent, setDeferredEvent] = useState(null);

  useEffect(() => {
    // Registered unconditionally (not just when Settings/notifications are
    // opted into) — Chrome won't consider the site installable, and won't
    // fire beforeinstallprompt, without an active service worker.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {});
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredEvent(event);
    };
    const handleAppInstalled = () => setDeferredEvent(null);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return "unavailable";
    deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    // Chrome only lets a given prompt event be used once.
    setDeferredEvent(null);
    return outcome; // "accepted" | "dismissed"
  }, [deferredEvent]);

  return (
    <PwaContext.Provider
      value={{
        canInstall: Boolean(deferredEvent) && !isInstalled,
        isInstalled,
        isIOS: isIOS && !isInstalled,
        promptInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}
