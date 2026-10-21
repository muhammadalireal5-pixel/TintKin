"use client";

import { useSyncExternalStore } from "react";

// Companion preferences live in localStorage (per device): on/off, where the
// user dragged it, which tours they finished and which reminders already
// showed today. Wrapped in try/catch because storage can be unavailable.
const KEY = "tk:companion";
const EVENT = "tk-companion-prefs";

const DEFAULTS = Object.freeze({
  enabled: true,
  pos: null,
  tours: {},
  seen: {},
  tipIndex: 0,
  // Unprompted nudges (reminders, greetings) stay silent between these hours.
  quietHours: { enabled: true, start: "21:00", end: "08:00" },
});

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

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/** True when `date` falls inside the user's quiet hours (the window may wrap past midnight). */
export function isQuietNow(prefs, date = new Date()) {
  const q = prefs?.quietHours;
  if (!q?.enabled) return false;
  const start = toMinutes(q.start);
  const end = toMinutes(q.end);
  if (start === null || end === null || start === end) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return start < end ? now >= start && now < end : now >= start || now < end;
}

/** Make Kin say something (e.g. praise after an action). Safe to call from anywhere. */
export function kinSay(text) {
  window.dispatchEvent(new CustomEvent("tk-kin-say", { detail: { text } }));
}

/** Ask the companion to re-read the account snapshot (after ticking a routine step, etc.). */
export function refreshCompanion() {
  window.dispatchEvent(new Event("tk-companion-refresh"));
}
