import test from "node:test";
import assert from "node:assert/strict";
import { advanceStreak, displayStreak, weekKeyOf, summarizeActivity } from "../lib/utils/streak.js";

test("weekKeyOf returns the Monday of the week", () => {
  assert.equal(weekKeyOf("2026-10-21"), "2026-10-19"); // Wednesday
  assert.equal(weekKeyOf("2026-10-25"), "2026-10-19"); // Sunday
  assert.equal(weekKeyOf("2026-10-19"), "2026-10-19");
});

test("consecutive day extends the streak", () => {
  const r = advanceStreak({ stored: 4, lastKey: "2026-10-20", todayKey: "2026-10-21" });
  assert.equal(r.streak, 5);
  assert.equal(r.usedFreeze, false);
});

test("same day does not change the streak", () => {
  const r = advanceStreak({ stored: 4, lastKey: "2026-10-21", todayKey: "2026-10-21" });
  assert.equal(r.streak, 4);
  assert.equal(r.isNewDay, false);
});

test("one missed day is forgiven once per week", () => {
  const first = advanceStreak({ stored: 6, lastKey: "2026-10-19", todayKey: "2026-10-21" });
  assert.equal(first.streak, 7);
  assert.equal(first.usedFreeze, true);
  assert.equal(first.freezeWeek, "2026-10-19");

  const second = advanceStreak({ stored: 7, lastKey: "2026-10-22", todayKey: "2026-10-24", freezeWeek: first.freezeWeek });
  assert.equal(second.streak, 1);
});

test("the freeze renews the next week", () => {
  const r = advanceStreak({ stored: 7, lastKey: "2026-10-25", todayKey: "2026-10-27", freezeWeek: "2026-10-19" });
  assert.equal(r.streak, 8);
});

test("a longer gap resets to 1", () => {
  assert.equal(advanceStreak({ stored: 9, lastKey: "2026-10-10", todayKey: "2026-10-21" }).streak, 1);
});

test("a wider allowedGapDays forgives extra days", () => {
  assert.equal(advanceStreak({ stored: 3, lastKey: "2026-10-19", todayKey: "2026-10-21", allowedGapDays: 2 }).streak, 4);
  assert.equal(advanceStreak({ stored: 3, lastKey: "2026-10-18", todayKey: "2026-10-21", allowedGapDays: 2 }).usedFreeze, true);
});

test("displayStreak keeps a forgivable gap and drops a broken one", () => {
  assert.equal(displayStreak({ stored: 6, lastKey: "2026-10-20", todayKey: "2026-10-21" }), 6);
  assert.equal(displayStreak({ stored: 6, lastKey: "2026-10-19", todayKey: "2026-10-21" }), 6);
  assert.equal(displayStreak({ stored: 6, lastKey: "2026-10-19", todayKey: "2026-10-21", freezeWeek: "2026-10-19" }), 0);
  assert.equal(displayStreak({ stored: 6, lastKey: "2026-10-10", todayKey: "2026-10-21" }), 0);
});

test("summarizeActivity counts scan and routine days once each", () => {
  const dayKeyOf = (d) => d.toISOString().slice(0, 10);
  const out = summarizeActivity({
    todayKey: "2026-10-21",
    dayKeyOf,
    scans: [
      { takenAt: "2026-10-21T08:00:00Z", overallScore: 70, isAnalyzed: true },
      { takenAt: "2026-10-20T08:00:00Z", overallScore: 74, isAnalyzed: true },
      { takenAt: "2026-09-28T08:00:00Z", overallScore: 60, isAnalyzed: true },
    ],
    logs: [
      { date: "2026-10-21T20:00:00Z", amCompleted: ["a"], pmCompleted: [] },
      { date: "2026-10-19T20:00:00Z", amCompleted: [], pmCompleted: ["b"] },
      { date: "2026-10-18T20:00:00Z", amCompleted: [], pmCompleted: [] },
    ],
  });
  assert.equal(out.monthDays, 3);
  assert.equal(out.weekDays, 3);
  assert.equal(out.prevMonthDays, 1);
  assert.equal(out.monthScore, 72);
  assert.equal(out.prevMonthScore, 60);
  assert.equal(out.bestWeekDays, 3);
});

test("rolling average smooths single scans over a trailing 7-day window", async () => {
  const { rollingAverage } = await import("../lib/utils/trend.js");
  const day = (d) => new Date(Date.UTC(2026, 9, d));
  const pts = [
    { at: day(1), score: 60 },
    { at: day(3), score: 70 },
    { at: day(5), score: 50 },
    { at: day(20), score: 80 },
  ];
  assert.deepEqual(rollingAverage(pts), [60, 65, 60, 80]);
  assert.deepEqual(rollingAverage([]), []);
});
