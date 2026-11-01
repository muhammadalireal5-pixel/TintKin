import test from "node:test";
import assert from "node:assert/strict";
import { parseIngredients, checkProduct } from "../lib/plan/product-check.js";

const user = (sp = {}, over = {}) => ({
  sex: "female",
  skinType: "combination",
  skinProfile: { concerns: [{ key: "acne", rating: 2 }, { key: "dryness", rating: 3 }], sensitivity: "low", phototype: 3, pregnancy: "no", currentProducts: [], ...sp },
  ...over,
});

const RETINOL_SERUM = "Ingredients: Aqua, Glycerin, Squalane, Retinol, Niacinamide, Phenoxyethanol, Parfum";
const BHA = "Water, Salicylic Acid, Butylene Glycol, Sodium Hyaluronate, Phenoxyethanol";

test("parses a pasted list and drops duplicates and the label prefix", () => {
  const list = parseIngredients("INGREDIENTS: Aqua, Glycerin,\nGlycerin; Niacinamide (Vitamin B3, 5%). ");
  assert.deepEqual(list, ["Aqua", "Glycerin", "Niacinamide (Vitamin B3 5%)"]);
});

test("finds classes and how they fit the person's concerns", () => {
  const out = checkProduct(parseIngredients(RETINOL_SERUM), user());
  const classes = out.classes.map((c) => c.cls);
  assert.ok(classes.includes("retinoid"));
  assert.ok(classes.includes("niacinamide"));
  assert.ok(out.fit.some((f) => f.key === "acne"));
  assert.equal(out.slot, "pm");
});

test("a retinoid is flagged to avoid when pregnant", () => {
  const out = checkProduct(parseIngredients(RETINOL_SERUM), user({ pregnancy: "yes" }));
  assert.equal(out.verdict, "avoid");
  assert.ok(out.flags.some((f) => /pregnant/.test(f.msg)));
});

test("sensitive skin gets fragrance and strong-active flags", () => {
  const out = checkProduct(parseIngredients(RETINOL_SERUM), user({ sensitivity: "high" }));
  assert.equal(out.verdict, "avoid");
  assert.ok(out.flags.some((f) => /Fragrance/.test(f.msg)));
});

test("a second strong active conflicts with the plan's retinoid", () => {
  const plan = [{ text: "Apply adapalene", slot: "pm", cls: "retinoid", endDay: null }];
  const out = checkProduct(parseIngredients(BHA), user(), plan);
  assert.equal(out.verdict, "caution");
  assert.ok(out.conflicts.some((c) => /strong actives/.test(c)));
});

test("the same class as a plan step is called a duplicate", () => {
  const plan = [{ text: "Apply a niacinamide serum", slot: "am", cls: "niacinamide", endDay: null }];
  const out = checkProduct(parseIngredients("Water, Niacinamide, Zinc PCA, Glycerin"), user(), plan);
  assert.ok(out.conflicts.some((c) => /already has a niacinamide/.test(c)));
});

test("an active below the 1% line is marked as a trace amount", () => {
  const out = checkProduct(parseIngredients("Aqua, Glycerin, Phenoxyethanol, Retinyl Palmitate"), user());
  assert.equal(out.classes.find((c) => c.cls === "retinoid").trace, true);
  assert.ok(!out.flags.length && !out.conflicts.length);
});

test("hydroquinone is always avoid", () => {
  const out = checkProduct(parseIngredients("Water, Hydroquinone, Glycerin"), user());
  assert.equal(out.verdict, "avoid");
});
