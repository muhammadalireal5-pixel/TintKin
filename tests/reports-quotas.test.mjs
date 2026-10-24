import { test } from "node:test";
import assert from "node:assert/strict";

const { getTierScanLimits } = await import("../lib/constants/quotas.js");
const { getLocalMonthStart } = await import("../lib/utils/date.js");
const { findPendingReport, getReportStatus, buildCheckInReport } = await import("../lib/plan/report.js");
const { jpegToPdf, dataUrlToBytes } = await import("../lib/utils/pdf.js");

test("scan allowances are fixed per tier and share a 5-a-day cap", () => {
  assert.deepEqual(getTierScanLimits("free"), { dailyLimit: 5, monthlyLimit: 2 });
  assert.deepEqual(getTierScanLimits("standard"), { dailyLimit: 5, monthlyLimit: 6 });
  assert.deepEqual(getTierScanLimits("premium"), { dailyLimit: 5, monthlyLimit: 12 });
  assert.equal(getTierScanLimits("nonsense").monthlyLimit, 2);
});

test("days in month follow the user's timezone at month boundaries", () => {
  // 2026-02-28 20:00 UTC is already March 1st in Tokyo (UTC+9).
  const ref = new Date("2026-02-28T20:00:00Z");
  assert.equal(getLocalMonthStart("UTC", ref).daysInMonth, 28);
  assert.equal(getLocalMonthStart("Asia/Tokyo", ref).daysInMonth, 31);
});

const scores = (v) => ({ wrinkles: v, firmness: v, spots: v, radiance: v });
const makePlan = (checkIns, extra = {}) => ({
  _id: "p1",
  status: "active",
  startedAt: "2026-10-01",
  baseline: { overallScore: 60, scores: scores(60) },
  focus: [{ metric: "radiance", label: "Radiance", baseline: 60, target: 65 }],
  checkIns,
  ...extra,
});
const done = (day, overall) => ({ day, status: "done", overallScore: overall, scores: scores(overall) });
const upcoming = (day) => ({ day, status: "upcoming" });

test("a report unlocks per completed check-in and each check-in gets one report", () => {
  const plan = makePlan([done(7, 63), upcoming(14), upcoming(28)]);
  assert.deepEqual(getReportStatus([plan], []), { ready: true, checkInDay: 7, hasPlan: true, nextCheckInDay: 14 });
  assert.equal(getReportStatus([plan], [{ planId: "p1", checkInDay: 7 }]).ready, false);
  assert.equal(getReportStatus([], []).hasPlan, false);
});

test("pending reports go oldest first and compare with the previous check-in", () => {
  const plan = makePlan([done(7, 63), done(14, 66), upcoming(28)]);
  const first = findPendingReport([plan], []);
  assert.equal(first.checkIn.day, 7);
  assert.equal(first.prevCheckIn, null);
  const second = findPendingReport([plan], [{ planId: "p1", checkInDay: 7 }]);
  assert.equal(second.checkIn.day, 14);
  assert.equal(second.prevCheckIn.day, 7);
});

test("check-in report says how the plan is going", () => {
  const plan = makePlan([done(7, 64)]);
  const up = buildCheckInReport(plan, plan.checkIns[0], null, { dateLabel: "Oct 8" });
  assert.equal(up.title, "Day 7 Check-in Report · Oct 8");
  assert.equal(up.trend, "improving");
  assert.equal(up.trendValue, 4);
  assert.match(up.summary, /up 4 since your starting point/);
  assert.match(up.summary, /Radiance 60 → 64 \(aim 65\)/);
  assert.equal(up.highlights.length, 4);

  const steady = buildCheckInReport(plan, done(14, 65), { day: 7, overallScore: 64, scores: scores(64) });
  assert.equal(steady.trend, "stable");
  assert.match(steady.summary, /steady since your day 7 check-in/);
  assert.equal(buildCheckInReport(plan, done(14, 58), plan.checkIns[0]).trend, "declining");
});

test("jpegToPdf writes a structurally valid single-page PDF", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
  const pdf = jpegToPdf(jpeg, 1588, 2246);
  const text = Buffer.from(pdf).toString("latin1");

  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/MediaBox \[0 0 595\.28 841\.\d+\]/);
  assert.match(text, /\/Width 1588 \/Height 2246/);
  assert.match(text, new RegExp(`/Length ${jpeg.length} >>`));

  // Every xref entry must point at the matching "N 0 obj" header.
  const startxref = Number(/startxref\n(\d+)/.exec(text)[1]);
  assert.ok(text.slice(startxref).startsWith("xref"));
  const entries = text.slice(startxref).split("\n").slice(3, 8);
  entries.forEach((entry, i) => {
    const offset = Number(entry.slice(0, 10));
    assert.ok(text.slice(offset).startsWith(`${i + 1} 0 obj`), `object ${i + 1} offset`);
  });
});

test("dataUrlToBytes decodes base64 data URLs", () => {
  assert.deepEqual([...dataUrlToBytes("data:image/jpeg;base64,/9j/")], [0xff, 0xd8, 0xff]);
});
