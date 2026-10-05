"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getReportStatus } from "@/app/lib/actions";

// One shared fetch for every consumer (desktop nav, mobile nav, pages), so the
// "report ready" badge doesn't trigger a server action per component.
let status = null;
let inflight = null;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

export function refreshReportStatus() {
  if (inflight) return inflight;
  inflight = getReportStatus()
    .then((next) => {
      status = next;
      emit();
      return next;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @param {boolean} enabled - only fetch for signed-in users */
export function useReportStatus(enabled) {
  const current = useSyncExternalStore(subscribe, () => status, () => null);
  useEffect(() => {
    if (enabled && !status) refreshReportStatus();
  }, [enabled]);
  return enabled ? current : null;
}
