"use client";

import { useEffect, useSyncExternalStore } from "react";

// While a route's loading skeleton is on screen, the app chrome (logo, profile,
// Kin) shows skeletons too, so the whole screen appears together when the data
// arrives instead of in pieces. A loading.jsx renders <PageLoadingMarker />;
// the chrome listens with usePageLoading().
//
// The state is read from the DOM (is a marker mounted right now?) rather than
// from a counter, so a missed cleanup can never leave the chrome stuck hidden.
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const read = () => document.querySelector("[data-page-loading]") !== null;

/** True while any loading skeleton is mounted. The server render counts as loading. */
export function usePageLoading() {
  return useSyncExternalStore(subscribe, read, () => true);
}

export function PageLoadingMarker() {
  useEffect(() => {
    emit();
    // The marker is gone from the DOM by the time this cleanup runs.
    return emit;
  }, []);
  return <span data-page-loading hidden />;
}
