import test from "node:test";
import assert from "node:assert/strict";
import { measureImagePixels, assessImagePixels, assessScanConfidence, sanitizeClientQuality, describeIssues, isLowConfidence } from "../lib/utils/image-quality.js";
import { projectTrajectory } from "../app/lib/predict.js";

const make = (w, h, fn) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const g = Math.max(0, Math.min(255, fn(x, y)));
      const i = (y * w + x) * 4;
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
};

const texture = (x, y) => 22 * Math.sin(x * 1.3) * Math.cos(y * 1.1) + 9 * Math.sin((x + y) * 2.1);

const good = () => make(96, 96, (x, y) => 130 + texture(x, y));
const dark = () => make(96, 96, (x, y) => 22 + texture(x, y) * 0.3);
const bright = () => make(96, 96, (x, y) => 238 + texture(x, y) * 0.3);
const flat = () => make(96, 96, (x) => 100 + x * 0.3);
const uneven = () => make(96, 96, (x, y) => (x < 48 ? 85 : 175) + texture(x, y));
const blown = () => make(96, 96, (x, y) => (y < 45 ? 255 : 120 + texture(x, y)));
const mildlyDim = () => make(96, 96, (x, y) => 55 + texture(x, y));

test("confirmed: nothing in the scan flow measured lighting before; a dark photo now reads as retake", () => {
  const r = assessImagePixels(dark());
  assert.equal(r.verdict, "retake");
  assert.ok(r.issues.includes("too_dark"));
});

test("a well-lit, textured photo is fine", () => {
  const r = assessImagePixels(good());
  assert.equal(r.verdict, "ok", JSON.stringify(r));
  assert.deepEqual(r.issues, []);
});

test("an over-bright photo and one with blown highlights are retakes", () => {
  assert.equal(assessImagePixels(bright()).verdict, "retake");
  const r = assessImagePixels(blown());
  assert.equal(r.verdict, "retake");
  assert.ok(r.issues.includes("blown_highlights"));
});

test("a featureless, blurred photo is a retake", () => {
  const r = assessImagePixels(flat());
  assert.equal(r.verdict, "retake");
  assert.ok(r.issues.includes("blurry"));
});

test("uneven side lighting is analysable but low confidence", () => {
  const r = assessImagePixels(uneven());
  assert.equal(r.verdict, "low");
  assert.deepEqual(r.issues, ["uneven_light"]);
});

test("a slightly dim photo is low confidence, not a retake", () => {
  const r = assessImagePixels(mildlyDim());
  assert.equal(r.verdict, "low");
  assert.ok(r.issues.includes("too_dark"));
});

test("metrics are plain finite numbers", () => {
  const m = measureImagePixels(good());
  for (const v of Object.values(m)) assert.ok(Number.isFinite(v));
  assert.ok(m.meanLuma > 100 && m.meanLuma < 160);
});

test("the thresholds can be tuned without touching the logic", () => {
  const strict = { retake: { meanLumaBelow: 0, meanLumaAbove: 256, clipHighAbove: 1, clipLowAbove: 1, sharpnessBelow: 0 }, low: { meanLumaBelow: 200, meanLumaAbove: 256, clipHighAbove: 1, sharpnessBelow: 0, unevennessAbove: 9 } };
  assert.equal(assessImagePixels(good(), strict).verdict, "low");
});

test("the server only accepts known verdicts, issue codes and numbers from the client", () => {
  assert.equal(sanitizeClientQuality(null), null);
  assert.equal(sanitizeClientQuality({ verdict: "great" }), null);
  const clean = sanitizeClientQuality({ verdict: "low", issues: ["uneven_light", "<script>", 4], metrics: { meanLuma: 120.123456, sharpness: "x", evil: 1 } });
  assert.deepEqual(clean, { verdict: "low", issues: ["uneven_light"], metrics: { meanLuma: 120.123 } });
});

const full = { wrinkles: 70, firmness: 70, spots: 70, radiance: 70 };

test("confidence: a good photo with all measures is good", () => {
  const c = assessScanConfidence({ clientQuality: { verdict: "ok", issues: [], metrics: {} }, scores: full });
  assert.equal(c.level, "good");
  assert.equal(c.checked, true);
});

test("confidence: a marginal photo is low, and says why", () => {
  const c = assessScanConfidence({ clientQuality: { verdict: "low", issues: ["uneven_light"], metrics: {} }, scores: full });
  assert.equal(c.level, "low");
  assert.deepEqual(c.issues, ["uneven_light"]);
  assert.match(describeIssues(c.issues), /uneven/);
});

test("confidence: a missing skin measure makes the scan low confidence", () => {
  const c = assessScanConfidence({ clientQuality: { verdict: "ok", issues: [], metrics: {} }, scores: { ...full, spots: null } });
  assert.equal(c.level, "low");
  assert.deepEqual(c.issues, ["incomplete_scores"]);
});

test("confidence: no client measurement does not lower it, but is recorded as unchecked", () => {
  const c = assessScanConfidence({ scores: full });
  assert.equal(c.level, "good");
  assert.equal(c.checked, false);
});

test("confidence: a low verdict with no usable issue codes is still low", () => {
  const c = assessScanConfidence({ clientQuality: { verdict: "low", issues: [], metrics: {} }, scores: full });
  assert.equal(c.level, "low");
  assert.deepEqual(c.issues, ["poor_photo"]);
});

test("low-confidence scans do not move the What-If velocity", () => {
  const scan = (day, wrinkles, level) => ({ takenAt: `2026-0${day < 15 ? 8 : 9}-${String(day).padStart(2, "0")}`, scores: { wrinkles }, quality: { level } });
  const steady = [scan(1, 70, "good"), scan(10, 70, "good"), scan(20, 70, "good"), scan(28, 70, "good"), scan(29, 70, "good")];
  const withNoise = [...steady, scan(30, 20, "low"), scan(31, 95, "low")];
  const a = projectTrajectory({ wrinkles: 70 }, 1, {}, [], steady);
  const b = projectTrajectory({ wrinkles: 70 }, 1, {}, [], withNoise);
  assert.deepEqual(b.scores, a.scores);
  assert.equal(isLowConfidence({ quality: { level: "low" } }), true);
  assert.equal(isLowConfidence({}), false);
});
