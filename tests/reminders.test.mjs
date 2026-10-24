import test from "node:test";
import assert from "node:assert/strict";
import { pickReminder, slotForHour, localHour } from "../lib/push/reminders.js";

const base = { firstName: "Sam", streak: 0, scannedToday: false, stepsDone: 0, stepsTotal: 6, pmLeft: 3, daysSinceActive: 0, seed: "u:2026-10-21:am" };

test("slots only fire at 9 and 19 local time", () => {
  assert.equal(slotForHour(9), "am");
  assert.equal(slotForHour(19), "pm");
  assert.equal(slotForHour(13), null);
  assert.equal(localHour("UTC", new Date("2026-10-21T09:30:00Z")), 9);
});

test("morning nudge only when nothing done yet, and mentions the streak", () => {
  const r = pickReminder({ ...base, slot: "am", streak: 6 });
  assert.match(r.body, /6|7/);
  assert.equal(r.url, "/routine");
  assert.equal(pickReminder({ ...base, slot: "am", scannedToday: true }), null);
  assert.equal(pickReminder({ ...base, slot: "am", stepsDone: 1 }), null);
});

test("evening nudges depend on what is left", () => {
  assert.equal(pickReminder({ ...base, slot: "pm" }).url, "/routine");
  const pm = pickReminder({ ...base, slot: "pm", scannedToday: true, stepsDone: 3 });
  assert.equal(pm.url, "/routine?tab=pm");
  assert.match(pm.body, /3/);
  assert.equal(pickReminder({ ...base, slot: "pm", scannedToday: true, stepsDone: 6, pmLeft: 0 }), null);
});

test("the morning ask is the routine unless a check-in is due", () => {
  const due = pickReminder({ ...base, slot: "am", checkInDue: true });
  assert.equal(due.url, "/routine");
  assert.match(due.body, /check-in/i);
  assert.doesNotMatch(pickReminder({ ...base, slot: "am" }).body, /scan/i);
  assert.equal(pickReminder({ ...base, slot: "am", checkInDue: true, stepsDone: 1 }), null);
});

test("lapsed users are not nagged and wording is stable per seed", () => {
  assert.equal(pickReminder({ ...base, slot: "am", daysSinceActive: 30 }), null);
  assert.equal(pickReminder({ ...base, slot: "am" }).body, pickReminder({ ...base, slot: "am" }).body);
});
