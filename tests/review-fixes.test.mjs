import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, buildFocus, classifyProfile, filterSafeSteps } from "../lib/plan/engine.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";
import { applyAdjustment, getStepsForDay, isLive } from "../lib/plan/state.js";
import { endUnsafeSteps, mergePlanWithProfile } from "../lib/plan/rebuild.js";
import { findPendingReport, getReportStatus } from "../lib/plan/report.js";

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
const planFor = (u = user()) =>
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
const apply = (plan, adj, day, opts) => ({ ...plan, ...applyAdjustment(plan, { note: "", drop: [], add: { am: [], pm: [] }, ...adj }, day, opts) });

test("safety filter knows brand names, vitamin A and gentle-sounding acids", () => {
  const steps = ["Apply Differin gel nightly", "Use Retin-A cream", "Try tazarotene", "Take a vitamin A serum", "Lactic acid peel", "Mandelic acid toner", "Use retinyl palmitate", "Apply niacinamide"].map((text) => ({ text }));
  for (const sp of [{ pregnancy: "yes" }, { sensitivity: "high" }]) {
    assert.deepEqual(filterSafeSteps(steps, user(sp)).map((s) => s.text), ["Apply niacinamide"], JSON.stringify(sp));
  }
});

test("a profile that now rules out lactic acid stops that step too", () => {
  const plan = planFor(user({ concerns: [{ key: "radiance", rating: 2 }] }));
  assert.ok(Object.values(plan.steps).some((s) => /lactic/i.test(s.text)), "plan starts with a lactic acid exfoliant");
  const swept = endUnsafeSteps(plan, user({ concerns: [{ key: "radiance", rating: 2 }], pregnancy: "yes" }), 12);
  assert.ok(swept.stopped.length >= 1);
});

test("a step that has not started yet can be dropped, and cannot be added twice", () => {
  const plan = planFor();
  const future = plan.steps.find((s) => s.startDay > 3);
  assert.ok(future);
  assert.equal(isLive(future, 3), true);
  const after = apply(plan, { drop: [future.id] }, 3);
  assert.equal(isLive(after.steps.find((s) => s.id === future.id), 3), false);
  for (const day of [14, 20, 30]) assert.ok(!texts(after, day).includes(future.text.toLowerCase()), `day ${day}`);

  // Kin cannot add a copy of a step that is already due later.
  const dup = apply(plan, { add: { am: [], pm: [{ text: future.text, why: "x" }] } }, 3);
  assert.equal(dup.steps.length, plan.steps.length);
});

test("on the last day a replacement takes over from the dropped step instead of overlapping it", () => {
  const plan = planFor();
  const today = getStepsForDay(plan, 30);
  const target = today.pm[today.pm.length - 1];
  const after = apply(plan, { drop: [target.id], add: { am: [], pm: [{ text: "Brand new evening step", why: "w" }] } }, 30);
  const pm = getStepsForDay(after, 30).pm.map((s) => s.text);
  assert.ok(pm.includes("Brand new evening step"));
  assert.ok(!pm.includes(target.text), "dropped step is gone from day 30");
  assert.ok(pm.length <= 6);
});

test("adjustments record who made them", () => {
  const plan = planFor();
  assert.equal(apply(plan, {}, 5).adjustments.at(-1).source, "check-in");
  assert.equal(apply(plan, {}, 5, { source: "kin" }).adjustments.at(-1).source, "kin");
});

test("updating the plan keeps what Kin added and does not bring back what the person dropped", () => {
  const plan = planFor();
  const day = 10;
  const live = getStepsForDay(plan, day);
  const niacin = [...live.am, ...live.pm].find((s) => /niacinamide|azelaic|adapalene/i.test(s.text)) ?? live.pm[live.pm.length - 1];

  // Kin drops one step and adds its own.
  const edited = apply(plan, { drop: [niacin.id], add: { am: [{ text: "Hydrating mist after cleansing", why: "w" }], pm: [] } }, day, { source: "kin" });
  const kinStep = edited.steps.find((s) => s.text === "Hydrating mist after cleansing");
  assert.ok(kinStep);

  // Change an answer, then update the plan.
  const merged = mergePlanWithProfile(edited, user({ sleep: "under6" }), day);
  const result = { ...edited, ...merged.set };
  assert.ok(!merged.stopped.includes(kinStep.id), "Kin's step survives the update");
  assert.ok(texts(result, 12).includes("hydrating mist after cleansing"));
  const back = result.steps.filter((s) => s.text === niacin.text && s.endDay == null && s.id !== niacin.id);
  assert.equal(back.length, 0, "the step they dropped is not re-created");
});

test("updating the plan still stops a step Kin added if it is unsafe for the new answers", () => {
  const plan = planFor();
  const edited = apply(plan, { add: { am: [], pm: [{ text: "Apply Differin gel twice a week", why: "w" }] } }, 10, { source: "kin" });
  const merged = mergePlanWithProfile(edited, user({ pregnancy: "yes" }), 10);
  const differin = edited.steps.find((s) => /differin/i.test(s.text));
  assert.ok(merged.stopped.includes(differin.id));
});

test("a scan-completed check-in only unlocks its report once ratings are in", () => {
  const base = planFor();
  const scanned = { ...base, checkIns: base.checkIns.map((c) => (c.day === 7 ? { ...c, status: "done", method: "scan", ratings: {} } : c)) };
  assert.equal(findPendingReport([scanned], []), null);
  assert.equal(getReportStatus([scanned], []).ready, false);

  const rated = { ...scanned, checkIns: scanned.checkIns.map((c) => (c.day === 7 ? { ...c, ratings: { acne: 3 } } : c)) };
  assert.equal(findPendingReport([rated], []).checkIn.day, 7);

  // Old score-based plans never had ratings, so they are not held back.
  const legacy = { ...scanned, focus: scanned.focus.map((f) => ({ ...f, scale: "score" })) };
  assert.equal(findPendingReport([legacy], []).checkIn.day, 7);
});
