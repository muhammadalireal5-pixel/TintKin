import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, filterSafeSteps, classifyProfile } from "../lib/plan/engine.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";
import { mergePlanWithProfile } from "../lib/plan/rebuild.js";
import { applyAdjustment, getStepsForDay } from "../lib/plan/state.js";
import { deriveProductsFromPlan, classifyStep } from "../lib/plan/products.js";
import { PRODUCT_TYPES } from "../lib/constants/products.js";

const user = (sp = {}, over = {}) => ({
  sex: "female",
  skinType: "combination",
  skinProfile: {
    concerns: [{ key: "acne", rating: 2 }, { key: "spots", rating: 3 }, { key: "radiance", rating: 4 }],
    sensitivity: "low",
    phototype: 3,
    pregnancy: "no",
    currentProducts: [],
    routineTime: "full",
    ...sp,
  },
  ...over,
});

const planFor = (u) =>
  buildPlan({
    draft: sanitizeDraft(buildDraft(u)),
    scores: {},
    focus: classifyProfile(u).concerns.map((c) => ({ metric: c.key, label: c.key, baseline: c.rating, target: c.rating + 1, scale: "rating" })),
    startDayKey: "2026-10-01",
    startedAt: new Date("2026-10-01T00:00:00Z"),
  });

const formulas = (products) => products.map((p) => p.formula).join(" | ");
const liveClasses = (plan, day) => {
  const t = getStepsForDay(plan, day);
  return new Set([...t.am, ...t.pm].map((s) => classifyStep(s.text)).filter(Boolean));
};
const productClass = (p) => {
  if (p.type === "Sunscreen") return "sunscreen";
  if (p.type === "Cleanser") return "cleanser";
  if (p.type === "Moisturizer") return "moisturiser";
  if (p.type === "Exfoliant") return "acid";
  return null;
};

test("day 1 recommends only the basics the plan starts with", () => {
  const products = deriveProductsFromPlan(planFor(user()), 1);
  assert.deepEqual(products.map((p) => p.type).sort(), ["Cleanser", "Moisturizer", "Sunscreen"]);
});

test("products are the ones the live steps use, with the step's own reason", () => {
  const plan = planFor(user());
  const products = deriveProductsFromPlan(plan, 28);
  assert.ok(products.length >= 1 && products.length <= 3);
  for (const p of products) {
    assert.ok(PRODUCT_TYPES.includes(p.type));
    assert.ok(p.formula.length > 0 && p.description.length > 0);
  }
  assert.match(formulas(products), /adapalene|retinol|azelaic|niacinamide|vitamin c|acid/i);
});

test("a step that has not started yet is not recommended yet", () => {
  const plan = planFor(user());
  const early = formulas(deriveProductsFromPlan(plan, 2));
  const late = formulas(deriveProductsFromPlan(plan, 28));
  assert.notEqual(early, late);
  assert.doesNotMatch(early, /adapalene|retinol|azelaic/i);
});

test("every product maps to a live step: nothing contradicts today's routine", () => {
  const plan = planFor(user());
  for (const day of [1, 8, 15, 22, 28]) {
    const live = liveClasses(plan, day);
    for (const p of deriveProductsFromPlan(plan, day)) {
      const cls = productClass(p);
      if (cls) assert.ok(live.has(cls), `day ${day}: ${p.formula} has no live ${cls} step`);
    }
  }
});

test("editing the profile to pregnant removes the retinoid and strong acids from the products", () => {
  const before = planFor(user());
  assert.match(formulas(deriveProductsFromPlan(before, 28)), /adapalene|retinol|salicylic|lactic|mandelic/i);

  const edited = user({ pregnancy: "yes" });
  const merged = mergePlanWithProfile(before, edited, 10);
  const after = { ...before, ...merged.set };
  const products = deriveProductsFromPlan(after, 28);
  assert.doesNotMatch(formulas(products), /adapalene|retinol|salicylic|glycolic|lactic|mandelic|bha|aha/i);
});

test("dropping a step takes its product away", () => {
  const plan = planFor(user());
  const day = 28;
  const retinoidStep = getStepsForDay(plan, day).pm.find((s) => classifyStep(s.text) === "retinoid");
  assert.ok(retinoidStep, "the test plan should have a retinoid step");
  assert.match(formulas(deriveProductsFromPlan(plan, day)), /adapalene|retinol/i);

  const changes = applyAdjustment(plan, { drop: [retinoidStep.id], add: { am: [], pm: [] } }, day, { immediate: true });
  const after = { ...plan, ...changes };
  assert.doesNotMatch(formulas(deriveProductsFromPlan(after, day)), /adapalene|retinol/i);
});

test("dropping the sunscreen step removes the sunscreen product", () => {
  const plan = planFor(user());
  const sun = getStepsForDay(plan, 1).am.find((s) => classifyStep(s.text) === "sunscreen");
  const after = { ...plan, ...applyAdjustment(plan, { drop: [sun.id], add: { am: [], pm: [] } }, 2, { immediate: true }) };
  assert.ok(deriveProductsFromPlan(plan, 2).some((p) => p.type === "Sunscreen"));
  assert.ok(!deriveProductsFromPlan(after, 2).some((p) => p.type === "Sunscreen"));
});

test("a step added by Kin brings its product", () => {
  const plan = planFor(user({ concerns: [{ key: "dryness", rating: 2 }] }));
  const added = applyAdjustment(plan, { drop: [], add: { am: [], pm: [{ text: "Apply a niacinamide serum before your moisturiser", why: "Calms redness.", metric: null }] } }, 5, { immediate: true });
  const products = deriveProductsFromPlan({ ...plan, ...added }, 5);
  assert.match(formulas(products), /niacinamide/i);
});

test("a sensitive or pregnant plan never produces a product the safety filter refuses", () => {
  for (const u of [user({ sensitivity: "high" }), user({ pregnancy: "yes" }), user({ pregnancy: "prefer_not" })]) {
    const plan = planFor(u);
    for (const day of [1, 10, 20, 28]) {
      const products = deriveProductsFromPlan(plan, day);
      const text = products.map((p) => ({ text: `${p.type}: ${p.formula}` }));
      assert.equal(filterSafeSteps(text, u).length, text.length, `day ${day}: ${formulas(products)}`);
    }
  }
});

test("an empty plan gives no products", () => {
  assert.deepEqual(deriveProductsFromPlan({ steps: [], focus: [] }, 1), []);
  assert.deepEqual(deriveProductsFromPlan(null, 1), []);
});

test("the strongest focus area's active comes first", () => {
  const plan = planFor(user({ concerns: [{ key: "acne", rating: 1 }, { key: "radiance", rating: 4 }] }));
  const products = deriveProductsFromPlan(plan, 28);
  assert.ok(["Serum", "Exfoliant"].includes(products[0].type));
});
