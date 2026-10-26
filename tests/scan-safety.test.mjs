import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRecommendedProducts, makeProductsSafe, makeAdviceSafe, describeSkinProfile } from "../lib/plan/scan-safety.js";
import { filterSafeSteps } from "../lib/plan/engine.js";

const profile = (over = {}, sp = {}) => ({
  sex: "female",
  skinType: "combination",
  skinProfile: {
    concerns: [{ key: "wrinkles", rating: 2 }, { key: "spots", rating: 3 }],
    sensitivity: "low",
    phototype: 3,
    pregnancy: "no",
    currentProducts: [],
    ...sp,
  },
  ...over,
});

const pregnant = profile({}, { pregnancy: "yes" });
const unsure = profile({}, { pregnancy: "prefer_not" });
const sensitive = profile({}, { sensitivity: "high" });
const normal = profile();

const UNSAFE = /retin|adapalene|salicylic|glycolic|lactic|mandelic|bha|aha|peel|benzoyl|hydroquinone/i;

const aiProducts = () => [
  { type: "Serum", formula: "0.5% Retinol", description: "Smooths fine lines." },
  { type: "Exfoliant", formula: "2% Salicylic Acid (BHA)", description: "Clears pores." },
  { type: "Sunscreen", formula: "Broad-spectrum SPF", description: "Daily protection." },
];

const aiAdvice = () => ({
  critique: "Your firmness is good. Start a retinol at night to smooth lines. Wear sunscreen every day.",
  amRoutine: ["Apply gentle cleanser", "Apply vitamin C serum", "Wear sunscreen"],
  pmRoutine: ["Cleanse your face", "Apply retinol to dry skin", "Use glycolic acid peel twice a week", "Moisturise"],
  habits: ["Drink more water", "Use a salicylic acid spot treatment"],
  facialWorkout: "Gua Sha Jawline Sculpting: sweep upward for two minutes.",
  products: aiProducts(),
});

const textOf = (advice) =>
  [advice.critique, advice.facialWorkout, ...advice.amRoutine, ...advice.pmRoutine, ...advice.habits, ...advice.products.map((p) => `${p.type} ${p.formula} ${p.description}`)].join(" | ");

test("reproduction: the old shape-only check lets an unsafe product through unchanged", () => {
  const legacy = sanitizeRecommendedProducts(aiProducts());
  assert.match(legacy.map((p) => p.formula).join(" "), UNSAFE);
});

test("reproduction: the shipped fallback list contains vitamin C, which a sensitive profile must not get", () => {
  const legacy = sanitizeRecommendedProducts([]);
  assert.equal(filterSafeSteps(legacy.map((p) => ({ text: `${p.type}: ${p.formula}` })), sensitive).length < legacy.length, true);
});

for (const [name, user] of [["pregnant", pregnant], ["unsure", unsure], ["sensitive", sensitive]]) {
  test(`${name} profile gets zero unsafe suggestions from scan advice`, () => {
    const safe = makeAdviceSafe(aiAdvice(), user);
    assert.doesNotMatch(textOf(safe), UNSAFE);
    assert.equal(safe.products.length, 3);
    assert.equal(new Set(safe.products.map((p) => p.type)).size, 3);
  });

  test(`${name} profile: fallback and vitamin C products are replaced too`, () => {
    const safe = makeProductsSafe(sanitizeRecommendedProducts([]), user);
    assert.equal(safe.length, 3);
    if (name === "sensitive") assert.doesNotMatch(safe.map((p) => p.formula).join(" "), /vitamin c/i);
  });
}

test("a sensitive profile loses the vitamin C step the plan filter refuses", () => {
  const safe = makeAdviceSafe(aiAdvice(), sensitive);
  assert.deepEqual(safe.amRoutine, ["Apply gentle cleanser", "Wear sunscreen"]);
});

test("every safe fallback passes the strict plan filter", () => {
  const safe = makeProductsSafe([], pregnant);
  assert.equal(filterSafeSteps(safe.map((p) => ({ text: `${p.type}: ${p.formula}` })), pregnant).length, safe.length);
});

test("a normal profile keeps its products, routines and critique", () => {
  const advice = aiAdvice();
  const safe = makeAdviceSafe(advice, normal);
  assert.deepEqual(safe.products, advice.products);
  assert.deepEqual(safe.pmRoutine, advice.pmRoutine);
  assert.deepEqual(safe.amRoutine, advice.amRoutine);
  assert.equal(safe.critique, advice.critique);
  assert.equal(safe.facialWorkout, advice.facialWorkout);
});

test("safe items from the AI are kept in order, in the AI's own words", () => {
  const safe = makeAdviceSafe(aiAdvice(), pregnant);
  assert.deepEqual(safe.amRoutine, ["Apply gentle cleanser", "Apply vitamin C serum", "Wear sunscreen"]);
  assert.deepEqual(safe.pmRoutine, ["Cleanse your face", "Moisturise"]);
  assert.equal(safe.products[0].type, "Sunscreen");
});

test("unsafe sentences are dropped from the critique, safe ones stay", () => {
  const safe = makeAdviceSafe(aiAdvice(), pregnant);
  assert.equal(safe.critique, "Your firmness is good. Wear sunscreen every day.");
});

test("a critique that is entirely unsafe gets a neutral line, never empty", () => {
  const safe = makeAdviceSafe({ ...aiAdvice(), critique: "Use retinol nightly." }, pregnant);
  assert.ok(safe.critique.length > 10);
  assert.doesNotMatch(safe.critique, UNSAFE);
});

test("the prompt profile carries concerns and safety rules but never the raw pregnancy answer", () => {
  const text = describeSkinProfile(pregnant);
  assert.match(text, /Fine lines/);
  assert.match(text, /pregnancy-safe only/);
  assert.match(text, /phototype 3/);
  assert.doesNotMatch(text, /"yes"|pregnan\w+: yes/i);
});

test("an unreadable (encrypted, no key) profile is treated cautiously", () => {
  const unreadable = profile({}, { pregnancy: "enc:v1:aaaa:bbbb:cccc", sensitivity: "enc:v1:aaaa:bbbb:cccc" });
  const safe = makeAdviceSafe(aiAdvice(), unreadable);
  assert.doesNotMatch(textOf(safe), UNSAFE);
});
