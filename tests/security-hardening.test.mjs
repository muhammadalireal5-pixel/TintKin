import test from "node:test";
import assert from "node:assert/strict";
import { encryptField, decryptField, isEncrypted } from "../lib/utils/field-crypto.js";
import { classifyProfile, filterSafeSteps, filterNotDenied, buildDraft } from "../lib/plan/engine.js";
import { endUnsafeSteps } from "../lib/plan/rebuild.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);
const withEnv = (vars, fn) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) (v === undefined ? delete process.env[k] : (process.env[k] = v));
  }
};

test("health fields round-trip through AES-GCM and never show in plaintext", () => {
  withEnv({ FIELD_ENCRYPTION_KEY: KEY_A }, () => {
    const enc = encryptField("yes");
    assert.ok(isEncrypted(enc));
    assert.ok(!enc.includes("yes"));
    assert.equal(decryptField(enc), "yes");
    assert.notEqual(encryptField("yes"), enc, "fresh IV each time");
    assert.equal(encryptField(enc), enc, "already-encrypted values are left alone");
  });
});

test("legacy plaintext still reads, empty values stay empty", () => {
  withEnv({ FIELD_ENCRYPTION_KEY: KEY_A }, () => {
    assert.equal(decryptField("no"), "no");
    assert.equal(encryptField(""), "");
    assert.equal(encryptField(undefined), undefined);
  });
});

test("wrong key, missing key or tampered data decrypt to null, never to garbage", () => {
  const enc = withEnv({ FIELD_ENCRYPTION_KEY: KEY_A }, () => encryptField("prefer_not"));
  assert.equal(withEnv({ FIELD_ENCRYPTION_KEY: KEY_B }, () => decryptField(enc)), null);
  assert.equal(withEnv({ FIELD_ENCRYPTION_KEY: undefined }, () => decryptField(enc)), null);
  const parts = enc.split(":");
  parts[parts.length - 1] = Buffer.from("tampered").toString("base64");
  assert.equal(withEnv({ FIELD_ENCRYPTION_KEY: KEY_A }, () => decryptField(parts.join(":"))), null);
});

test("without a key, production fails closed and other environments store as is", () => {
  withEnv({ FIELD_ENCRYPTION_KEY: undefined, NODE_ENV: "production" }, () => assert.throws(() => encryptField("yes"), /FIELD_ENCRYPTION_KEY/));
  withEnv({ FIELD_ENCRYPTION_KEY: undefined, NODE_ENV: "development" }, () => assert.equal(encryptField("yes"), "yes"));
  withEnv({ FIELD_ENCRYPTION_KEY: "too-short", NODE_ENV: "production" }, () => assert.throws(() => encryptField("yes")));
});

test("an unreadable pregnancy or sensitivity answer is treated cautiously, never as 'no' or 'low'", () => {
  const p = classifyProfile({ sex: "female", skinType: "normal", skinProfile: { concerns: [{ key: "acne", rating: 2 }], pregnancy: null, sensitivity: null } });
  assert.equal(p.avoidUnsafe, true);
  const garbled = classifyProfile({ sex: "female", skinType: "normal", skinProfile: { concerns: [{ key: "acne", rating: 2 }], pregnancy: "enc:v1:xx", sensitivity: "enc:v1:xx" } });
  assert.equal(garbled.avoidUnsafe, true);
  assert.equal(garbled.sensitive, true);
  assert.equal(classifyProfile({ sex: "male", skinType: "normal", skinProfile: { concerns: [{ key: "acne", rating: 2 }], pregnancy: "no" } }).avoidUnsafe, false);
});

const careful = { sex: "female", skinType: "normal", skinProfile: { concerns: [{ key: "acne", rating: 2 }], pregnancy: "yes", sensitivity: "low" } };
const relaxed = { sex: "female", skinType: "normal", skinProfile: { concerns: [{ key: "acne", rating: 2 }], pregnancy: "no", sensitivity: "low" } };
const names = (steps) => steps.map((s) => s.text);

test("for pregnant or sensitive users the AI may only add the kinds of steps the engine recommends", () => {
  const proposals = [
    "Apply bakuchiol serum",
    "Use a clay mask once a week",
    "Try a derma roller",
    "Use a gentle gel cleanser",
    "Apply a ceramide moisturiser",
    "Apply a niacinamide serum",
    "Apply azelaic acid to clean skin",
    "Wind down: aim to be in bed 30 minutes earlier",
    "Apply a vitamin C serum before sunscreen",
  ].map((text) => ({ text }));
  assert.deepEqual(names(filterSafeSteps(proposals, careful)), [
    "Use a gentle gel cleanser",
    "Apply a ceramide moisturiser",
    "Apply a niacinamide serum",
    "Apply azelaic acid to clean skin",
    "Wind down: aim to be in bed 30 minutes earlier",
    "Apply a vitamin C serum before sunscreen",
  ]);
  const sensitive = { ...relaxed, skinProfile: { ...relaxed.skinProfile, sensitivity: "high" } };
  assert.ok(!names(filterSafeSteps(proposals, sensitive)).includes("Apply a vitamin C serum before sunscreen"), "no vitamin C for reactive skin");
});

test("people who need no extra care keep the deny-list only", () => {
  const out = names(filterSafeSteps([{ text: "Use a clay mask once a week" }, { text: "Apply Differin gel" }, { text: "Use hydroquinone cream" }], relaxed));
  assert.deepEqual(out, ["Use a clay mask once a week", "Apply Differin gel"]);
});

test("the sweep on an existing plan only uses the deny-list, so it never stops harmless older wording", () => {
  const plan = buildPlan({
    draft: sanitizeDraft(buildDraft(relaxed)),
    generatedBy: "rules",
    goals: [],
    startDayKey: "2026-10-01",
    startedAt: new Date("2026-10-01T00:00:00Z"),
  });
  plan.steps.push({ id: "s99", slot: "pm", text: "Use a clay mask once a week", why: "", metric: null, startDay: 1, endDay: null });
  const swept = endUnsafeSteps(plan, careful, 10);
  assert.ok(!swept.stopped.includes("s99"), "an odd but harmless step is left alone");
  assert.deepEqual(names(filterNotDenied([{ text: "Use a clay mask" }, { text: "Apply retinol" }], careful)), ["Use a clay mask"]);
});
