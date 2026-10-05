import { test } from "node:test";
import assert from "node:assert/strict";

const { getTierScanLimits } = await import("../lib/constants/quotas.js");
const { getLocalMonthStart } = await import("../lib/utils/date.js");
const { getReportProgress, SCANS_PER_REPORT } = await import("../lib/constants/reports.js");
const { jpegToPdf, dataUrlToBytes } = await import("../lib/utils/pdf.js");

test("premium monthly scan cap equals the number of days in the month", () => {
  const cases = [
    ["2026-01-15T12:00:00Z", 31],
    ["2026-02-15T12:00:00Z", 28],
    ["2028-02-15T12:00:00Z", 29], // leap year
    ["2026-04-15T12:00:00Z", 30],
    ["2026-10-04T12:00:00Z", 31],
    ["2026-11-04T12:00:00Z", 30],
  ];
  for (const [iso, expected] of cases) {
    const { daysInMonth } = getLocalMonthStart("UTC", new Date(iso));
    assert.equal(daysInMonth, expected, iso);
    assert.equal(getTierScanLimits("premium", daysInMonth).monthlyLimit, expected, iso);
  }
});

test("days in month follow the user's timezone at month boundaries", () => {
  // 2026-02-28 20:00 UTC is already March 1st in Tokyo (UTC+9).
  const ref = new Date("2026-02-28T20:00:00Z");
  assert.equal(getLocalMonthStart("UTC", ref).daysInMonth, 28);
  assert.equal(getLocalMonthStart("Asia/Tokyo", ref).daysInMonth, 31);
});

test("fixed-allowance tiers don't depend on month length", () => {
  assert.equal(getTierScanLimits("free", 31).monthlyLimit, 2);
  assert.equal(getTierScanLimits("standard", 28).monthlyLimit, 15);
});

test("report unlocks on the 7th scan since the last report", () => {
  assert.equal(SCANS_PER_REPORT, 7);
  assert.deepEqual(getReportProgress(0), { ready: false, count: 0, required: 7, remaining: 7 });
  assert.deepEqual(getReportProgress(6), { ready: false, count: 6, required: 7, remaining: 1 });
  assert.deepEqual(getReportProgress(7), { ready: true, count: 7, required: 7, remaining: 0 });
  assert.deepEqual(getReportProgress(12), { ready: true, count: 7, required: 7, remaining: 0 });
  assert.equal(getReportProgress(undefined).ready, false);
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
