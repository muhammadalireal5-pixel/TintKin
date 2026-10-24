import test from "node:test";
import assert from "node:assert/strict";
import { classifyProfile, buildDraft, buildFocus, ratingTarget, filterSafeSteps, safetyBrief } from "../lib/plan/engine.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";
import { getProgress, applySelfCheckIn, applyRatingsToCheckIn, toPlanView } from "../lib/plan/state.js";
import { validateOnboarding } from "../lib/validations/onboarding.js";

const user = (over = {}, sp = {}) => ({
  sex: "female",
  skinType: "combination",
  skinProfile: {
    concerns: [{ key: "acne", rating: 2 }, { key: "spots", rating: 3 }, { key: "radiance", rating: 4 }],
    sensitivity: "low",
    phototype: 3,
    pregnancy: "no",
    currentProducts: [],
    ...sp,
  },
  ...over,
});
const allText = (draft) => Object.values(draft.phases).flatMap((p) => [...p.am, ...p.pm]).map((s) => s.text.toLowerCase());
const STRONG = /retinol|retinoid|adapalene|salicylic|lactic|mandelic|bha|aha/;
const planFor = (u, ratings = {}) =>
  buildPlan({
    draft: sanitizeDraft(buildDraft(u)),
    generatedBy: "rules",
    goals: ["x"],
    startDayKey: "2026-10-01",
    startedAt: new Date("2026-10-01T00:00:00Z"),
    focus: buildFocus(classifyProfile(u)),
    ratings,
  });

test("classifyProfile falls back to legacy goals and conservative pregnancy", () => {
  const p = classifyProfile({ sex: "female", goals: ["Anti-aging/Firmness"], skinType: "oily" });
  assert.equal(p.concerns[0].key, "wrinkles");
  assert.equal(p.avoidUnsafe, true); // unanswered counts as unsafe for anyone who could be pregnant
  assert.equal(classifyProfile({ sex: "male", goals: [] }).avoidUnsafe, false);
});

test("week 1 is barrier-first: no actives, later weeks add one new active at a time", () => {
  const d = buildDraft(user());
  assert.equal(allText({ phases: { foundation: d.phases.foundation } }).filter((t) => STRONG.test(t)).length, 0);
  assert.ok(d.phases.target.pm.length >= 1);
  assert.ok(d.phases.target.pm[0].text.toLowerCase().includes("adapalene"));
});

test("never two strong actives (retinoid + acid) in one plan", () => {
  const d = buildDraft(user({}, { concerns: [{ key: "acne", rating: 2 }, { key: "radiance", rating: 2 }, { key: "pores", rating: 2 }] }));
  const strong = allText(d).filter((t) => STRONG.test(t));
  const kinds = new Set(strong.map((t) => (/retinol|retinoid|adapalene/.test(t) ? "retinoid" : "acid")));
  assert.ok(kinds.size <= 1, strong.join(" | "));
});

test("pregnant or unsure users never get retinoids or strong acids", () => {
  for (const pregnancy of ["yes", "prefer_not"]) {
    const d = buildDraft(user({}, { pregnancy, concerns: [{ key: "wrinkles", rating: 2 }, { key: "acne", rating: 2 }, { key: "pores", rating: 2 }] }));
    assert.equal(allText(d).filter((t) => STRONG.test(t)).length, 0, pregnancy);
  }
});

test("sensitive skin avoids strong actives; deeper skin tones get the gentle spot treatment", () => {
  const sensitive = buildDraft(user({ skinType: "sensitive" }, { sensitivity: "high", concerns: [{ key: "wrinkles", rating: 2 }, { key: "radiance", rating: 2 }] }));
  assert.equal(allText(sensitive).filter((t) => /retinol|retinoid|adapalene|salicylic|lactic|mandelic/.test(t)).length, 0);
  const deep = buildDraft(user({}, { phototype: 5, concerns: [{ key: "spots", rating: 2 }] }));
  assert.ok(allText(deep).some((t) => t.includes("azelaic")));
  assert.ok(!allText(deep).some((t) => /retinol/.test(t)));
});

test("a user already on a retinoid is not given a second one", () => {
  const d = buildDraft(user({}, { currentProducts: ["retinoid"] }));
  assert.ok(!allText(d).some((t) => /adapalene|retinol/.test(t)));
});

test("quick routines add at most one step per slot per phase", () => {
  const d = buildDraft(user({}, { routineTime: "quick" }));
  for (const key of ["target", "build", "lockin"]) {
    assert.ok(d.phases[key].am.length <= 1 && d.phases[key].pm.length <= 1, key);
  }
});

test("engine drafts build a valid plan with self-rated focus", () => {
  const u = user();
  const focus = buildFocus(classifyProfile(u));
  assert.deepEqual(focus[0], { metric: "acne", label: "Breakouts", baseline: 2, target: 3, scale: "rating" });
  assert.equal(ratingTarget(5), 5);
  const plan = planFor(u, { acne: 2, spots: 3, radiance: 4 });
  assert.equal(plan.generatedBy, "rules");
  assert.equal(plan.baseline.overallScore, null);
  assert.ok(plan.steps.length >= 5);
  assert.ok(plan.steps.every((s) => s.id && s.why));
});

test("self-rated check-ins complete the due check-in and move progress", () => {
  const plan = planFor(user(), { acne: 2, spots: 3, radiance: 4 });
  const early = applySelfCheckIn(plan, { acne: 3, spots: 3, radiance: 4 }, 3);
  assert.equal(early.completedDay, null); // day 3 is too early for the day-7 check-in
  const done = applySelfCheckIn(plan, { acne: 3, spots: 4, radiance: 4, bogus: 5 }, 7);
  assert.equal(done.completedDay, 7);
  const after = { ...plan, checkIns: done.checkIns, latest: done.latest };
  const acne = getProgress(after).focus.find((f) => f.metric === "acne");
  assert.deepEqual([acne.current, acne.delta, acne.percentToTarget, acne.rated], [3, 1, 100, true]);
  assert.equal(getProgress(plan).focus[0].rated, false);
  assert.equal(toPlanView(after, "2026-10-08").checkIns[0].method, "self");
});

test("ratings can be attached to a check-in a scan completed", () => {
  const base = planFor(user());
  const scanned = { ...base, checkIns: base.checkIns.map((c) => (c.day === 7 ? { ...c, status: "done", method: "scan", ratings: {} } : c)) };
  assert.equal(toPlanView(scanned, "2026-10-08").needsRatings, true);
  const attached = applyRatingsToCheckIn(scanned, { acne: 4 }, 7);
  assert.equal(attached.checkIns[0].ratings.acne, 4);
  assert.equal(toPlanView({ ...scanned, ...attached }, "2026-10-08").needsRatings, false);
});

test("AI-proposed steps are filtered by the same safety rules", () => {
  const steps = [{ text: "Use retinol nightly" }, { text: "Apply niacinamide" }, { text: "Glycolic acid peel" }, { text: "Try hydroquinone" }];
  assert.deepEqual(filterSafeSteps(steps, user({}, { pregnancy: "yes" })).map((s) => s.text), ["Apply niacinamide"]);
  assert.deepEqual(filterSafeSteps(steps, user({}, { pregnancy: "no" })).map((s) => s.text), ["Use retinol nightly", "Apply niacinamide", "Glycolic acid peel"]);
  assert.match(safetyBrief(user({}, { pregnancy: "yes" })), /pregnancy-safe/);
});

test("onboarding validation accepts the questionnaire and derives goals from concerns", () => {
  const ok = validateOnboarding({
    birthDate: "1995-05-05",
    sex: "female",
    skinType: "oily",
    concerns: [{ key: "acne", rating: 2 }, { key: "acne", rating: 5 }, { key: "nope", rating: 3 }, { key: "dryness", rating: 9 }, { key: "pores", rating: 3 }],
    sensitivity: "high",
    phototype: "4",
    pregnancy: "yes",
    currentProducts: ["retinoid", "bogus"],
    smoker: true,
  });
  assert.equal(ok.isValid, true);
  assert.deepEqual(ok.sanitized.skinProfile.concerns, [{ key: "acne", rating: 2 }, { key: "pores", rating: 3 }]);
  assert.deepEqual(ok.sanitized.goals, ["Reduce Acne/Pimples"]);
  assert.equal(ok.sanitized.skinProfile.phototype, 4);
  assert.deepEqual(ok.sanitized.skinProfile.currentProducts, ["retinoid"]);
  assert.equal(validateOnboarding({ birthDate: "1995-05-05", sex: "female", skinType: "oily" }).isValid, false);
  // legacy goals still work
  assert.equal(validateOnboarding({ birthDate: "1995-05-05", sex: "female", skinType: "oily", goals: ["Other"] }).isValid, true);
});
