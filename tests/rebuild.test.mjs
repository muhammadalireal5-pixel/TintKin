import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, buildFocus, classifyProfile } from "../lib/plan/engine.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";
import { getStepsForDay } from "../lib/plan/state.js";
import { endUnsafeSteps, mergePlanWithProfile } from "../lib/plan/rebuild.js";

const user = (sp = {}, over = {}) => ({
  sex: "female",
  skinType: "combination",
  goals: ["Reduce Acne/Pimples"],
  skinProfile: {
    concerns: [{ key: "acne", rating: 2 }, { key: "dryness", rating: 3 }],
    sensitivity: "low",
    phototype: 3,
    pregnancy: "no",
    currentProducts: [],
    ...sp,
  },
  ...over,
});
const planFor = (u) =>
  buildPlan({
    draft: sanitizeDraft(buildDraft(u)),
    generatedBy: "rules",
    goals: u.goals,
    startDayKey: "2026-10-01",
    startedAt: new Date("2026-10-01T00:00:00Z"),
    focus: buildFocus(classifyProfile(u)),
    ratings: { acne: 2, dryness: 3 },
  });
const texts = (plan, day) => {
  const s = getStepsForDay(plan, day);
  return [...s.am, ...s.pm].map((x) => x.text.toLowerCase());
};
const RETINOID = /adapalene|retinol|retinoid/;

test("safety sweep stops a retinoid right away once the answers rule it out", () => {
  const plan = planFor(user());
  assert.ok(texts(plan, 10).some((t) => RETINOID.test(t)), "plan starts with an adapalene step");
  const swept = endUnsafeSteps(plan, user({ pregnancy: "yes" }), 10);
  assert.equal(swept.stopped.length, 1);
  const after = { ...plan, steps: swept.steps };
  assert.ok(!texts(after, 10).some((t) => RETINOID.test(t)), "stopped today, not tomorrow");
  assert.ok(texts(after, 10).length > 0, "the rest of the routine is untouched");
  assert.deepEqual(endUnsafeSteps(plan, user(), 10).stopped, []);
});

test("safety sweep also cancels unsafe steps that have not started yet", () => {
  const plan = planFor(user());
  const swept = endUnsafeSteps(plan, user({ pregnancy: "yes" }), 2);
  const after = { ...plan, steps: swept.steps };
  for (const day of [3, 10, 20, 30]) assert.ok(!texts(after, day).some((t) => RETINOID.test(t)), `day ${day}`);
});

test("merging keeps the day, kept steps keep their ids, unsuitable steps end, new ones start tomorrow", () => {
  const plan = planFor(user());
  const before = getStepsForDay(plan, 10);
  const keptIds = [...before.am, ...before.pm].map((s) => s.id);
  const result = mergePlanWithProfile(plan, user({ pregnancy: "yes" }), 10);
  assert.ok(result.stopped.length >= 1);
  assert.ok(result.added.length >= 1);

  const merged = { ...plan, ...result.set, baseline: { ...plan.baseline, ratings: result.set["baseline.ratings"] } };
  // Today: stopped steps are still there until the end of today; nothing new yet.
  assert.ok(result.added.every((id) => !getStepsForDay(merged, 10).am.concat(getStepsForDay(merged, 10).pm).some((s) => s.id === id)));
  // Tomorrow: no retinoid, replaced by something safe, and the base routine keeps its ids.
  const tomorrow = getStepsForDay(merged, 11);
  const ids = [...tomorrow.am, ...tomorrow.pm].map((s) => s.id);
  assert.ok(!texts(merged, 11).some((t) => RETINOID.test(t)));
  assert.ok(texts(merged, 11).some((t) => t.includes("azelaic")));
  assert.ok(keptIds.filter((id) => ids.includes(id)).length >= 4, "base routine ids survive");
  assert.equal(result.set.version, plan.version + 1);
  assert.equal(result.set.adjustments.at(-1).note, "Updated to match your new answers.");
});

test("merging keeps progress on concerns that stay and baselines new ones", () => {
  const plan = planFor(user());
  const next = user({ concerns: [{ key: "dryness", rating: 4 }, { key: "redness", rating: 2 }] });
  const { set } = mergePlanWithProfile(plan, next, 12);
  const byMetric = Object.fromEntries(set.focus.map((f) => [f.metric, f]));
  assert.equal(byMetric.dryness.baseline, 3, "kept concern keeps its original starting point");
  assert.equal(byMetric.dryness.target, 4);
  assert.equal(byMetric.redness.baseline, 2, "new concern starts at its new rating");
  assert.deepEqual(set.focus.map((f) => f.metric), ["dryness", "redness"]);
  assert.equal(set["baseline.ratings"].dryness, 3);
});

test("merging is a no-op change set on the last day and with unchanged answers adds nothing", () => {
  const plan = planFor(user());
  assert.equal(mergePlanWithProfile(plan, user(), 30), null);
  const same = mergePlanWithProfile(plan, user(), 10);
  assert.deepEqual([same.added, same.stopped], [[], []]);
});
