"use client";

import { useSyncExternalStore } from "react";

// Companion preferences live in localStorage (per device): on/off, where the
// user dragged it, which tours they finished and which reminders already
// showed today. Wrapped in try/catch because storage can be unavailable.
const KEY = "tk:companion";
const EVENT = "tk-companion-prefs";

const DEFAULTS = Object.freeze({ enabled: true, pos: null, tours: {}, seen: {}, tipIndex: 0 });

let cachedRaw = null;
let cachedValue = DEFAULTS;

function read() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cachedValue;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    cachedValue = DEFAULTS;
  }
  return cachedValue;
}

export function updateCompanionPrefs(patch) {
  const current = read();
  const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: keep the value in memory for this session.
    cachedRaw = null;
    cachedValue = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCompanionPrefs() {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

/** Make Kin say something (e.g. praise after an action). Safe to call from anywhere. */
export function kinSay(text) {
  window.dispatchEvent(new CustomEvent("tk-kin-say", { detail: { text } }));
}

/** Ask the companion to re-read the account snapshot (after ticking a routine step, etc.). */
export function refreshCompanion() {
  window.dispatchEvent(new Event("tk-companion-refresh"));
}
