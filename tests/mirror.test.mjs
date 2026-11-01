import test from "node:test";
import assert from "node:assert/strict";
import { mirrorSummary } from "../lib/plan/mirror.js";

const day = (n) => new Date(Date.UTC(2026, 9, n)).toISOString().slice(0, 10);
const series = (values, from = 1) => values.map((value, i) => ({ dayKey: day(from + i), value }));

test("no baseline until three ratings exist", () => {
  const out = mirrorSummary(series([4, 5]), { todayKey: day(2) });
  assert.equal(out.baseline, null);
  assert.equal(out.earnedScan, false);
  assert.equal(out.today, 5);
});

test("five of the last seven days above baseline earns a scan", () => {
  const out = mirrorSummary(series([2, 2, 2, 3, 3, 3, 4, 2, 3, 4]), { todayKey: day(10), lastScanKey: day(0) });
  assert.equal(out.baseline, 2);
  assert.equal(out.betterDays, 6);
  assert.equal(out.earnedScan, true);
});

test("a scan less than ten days ago means no earned scan yet", () => {
  const out = mirrorSummary(series([2, 2, 2, 3, 3, 3, 4, 2, 3, 4]), { todayKey: day(10), lastScanKey: day(5) });
  assert.equal(out.earnedScan, false);
});

test("four better days is not enough", () => {
  const out = mirrorSummary(series([3, 3, 3, 4, 3, 4, 3, 4, 3, 4]), { todayKey: day(10) });
  assert.equal(out.betterDays, 4);
  assert.equal(out.earnedScan, false);
});

test("bad values are ignored", () => {
  const out = mirrorSummary([{ dayKey: day(1), value: 9 }, { dayKey: day(2), value: 2.5 }, { dayKey: null, value: 3 }], { todayKey: day(2) });
  assert.equal(out.today, null);
  assert.equal(out.baseline, null);
});
