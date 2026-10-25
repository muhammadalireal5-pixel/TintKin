import test from "node:test";
import assert from "node:assert/strict";
import { classifyProfile, buildDraft, buildFocus } from "../lib/plan/engine.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";
import { buildMonthReview, applyProposals, carryOverSteps, LOW_ADHERENCE } from "../lib/plan/review.js";
import { toPlanView } from "../lib/plan/state.js";
import { normalizeMonths, MAX_PLAN_MONTHS } from "../lib/constants/plan.js";
import { validateOnboarding } from "../lib/validations/onboarding.js";

const user = (sp = {}) => ({
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
});

function month1(u = user(), totalMonths = 3) {
  return buildPlan({
    draft: sanitizeDraft(buildDraft(u, { totalMonths })),
    generatedBy: "rules",
    startDayKey: "2026-10-01",
    startedAt: new Date("2026-10-01T00:00:00Z"),
    focus: buildFocus(classifyProfile(u)),
    ratings: {},
    monthIndex: 1,
    totalMonths,
  });
}

const withRatings = (plan, ratings) => ({ ...plan, latest: { ...plan.latest, ratings } });

test("normalizeMonths accepts 1..12 whole numbers only", () => {
  assert.equal(normalizeMonths(3), 3);
  assert.equal(normalizeMonths("7"), 7);
  assert.equal(normalizeMonths(MAX_PLAN_MONTHS), MAX_PLAN_MONTHS);
  assert.equal(normalizeMonths(0), null);
  assert.equal(normalizeMonths(13), null);
  assert.equal(normalizeMonths(2.5), null);
  assert.equal(normalizeMonths("abc", 1), 1);
});

test("onboarding validation keeps a valid plan length and leaves it out otherwise", () => {
  const base = { birthDate: "1990-01-01", sex: "female", skinType: "oily", concerns: [{ key: "acne", rating: 2 }] };
  assert.equal(validateOnboarding({ ...base, planMonths: 5 }).sanitized.skinProfile.planMonths, 5);
  assert.equal(validateOnboarding({ ...base, planMonths: 99 }).sanitized.skinProfile.planMonths, undefined);
  assert.equal(validateOnboarding(base).sanitized.skinProfile.planMonths, undefined);
});

test("a plan records which month of the journey it is", () => {
  const plan = month1(user(), 5);
  assert.equal(plan.monthIndex, 1);
  assert.equal(plan.totalMonths, 5);
  const view = toPlanView({ ...plan, _id: "x" }, "2026-10-03");
  assert.equal(view.monthIndex, 1);
  assert.equal(view.totalMonths, 5);
  // A legacy plan without the fields reads as month 1 of 1.
  const { monthIndex, totalMonths, ...legacy } = plan;
  assert.equal(toPlanView({ ...legacy, _id: "x" }, "2026-10-03").totalMonths, 1);
});

test("the review notices progress, steady areas and low consistency", () => {
  const plan = month1();
  const first = plan.focus[0].metric;
  const second = plan.focus[1].metric;
  const reviewed = withRatings(plan, { [first]: plan.focus[0].target, [second]: plan.focus[1].baseline });

  const good = buildMonthReview(reviewed, { adherencePercent: 80 });
  assert.equal(good.focus.find((f) => f.metric === first).status, "reached");
  assert.equal(good.focus.find((f) => f.metric === second).status, "steady");
  assert.ok(good.proposals.some((p) => p.id === `maintain:${first}`));
  assert.ok(good.proposals.some((p) => p.id === `promote:${second}`));
  assert.ok(!good.proposals.some((p) => p.kind === "lighter"));
  assert.ok(good.observations.some((o) => o.includes("80%")));

  // Low consistency: lighten the month instead of pushing harder.
  const low = buildMonthReview(reviewed, { adherencePercent: LOW_ADHERENCE - 1 });
  assert.ok(low.proposals.some((p) => p.kind === "lighter"));
  assert.ok(!low.proposals.some((p) => p.kind === "promote"));
});

test("the review knows when it is the last month", () => {
  const last = { ...month1(user(), 3), monthIndex: 3, totalMonths: 3 };
  assert.equal(buildMonthReview(last).isFinal, true);
  assert.equal(buildMonthReview(month1(user(), 3)).isFinal, false);
});

test("accepted proposals reorder concerns and shorten the routine", () => {
  const concerns = [{ key: "acne", rating: 3 }, { key: "spots", rating: 3 }, { key: "radiance", rating: 4 }];
  const out = applyProposals(concerns, "moderate", [
    { kind: "promote", metric: "radiance" },
    { kind: "maintain", metric: "acne" },
  ]);
  assert.deepEqual(out.concerns.map((c) => c.key), ["radiance", "spots", "acne"]);
  assert.equal(out.routineTime, "moderate");
  assert.equal(applyProposals(concerns, "full", [{ kind: "lighter" }]).routineTime, "quick");
  assert.deepEqual(applyProposals(concerns, "full", []).concerns, concerns);
});

test("the next month carries the running routine as week 1 and adds nothing twice", () => {
  const u = user();
  const plan = month1(u, 3);
  // Pretend the whole of month 1 has unlocked: every step is live at the end.
  const carry = carryOverSteps(plan);
  assert.ok(carry.am.length >= 3 && carry.pm.length >= 2);

  const draft = buildDraft(u, { carry, month: 2, totalMonths: 3 });
  assert.deepEqual(draft.phases.foundation.am.map((s) => s.text), carry.am.map((s) => s.text));
  assert.deepEqual(draft.phases.foundation.pm.map((s) => s.text), carry.pm.map((s) => s.text));
  assert.match(draft.summary, /Month 2 of 3/);

  const carried = new Set([...carry.am, ...carry.pm].map((s) => s.text));
  const added = ["target", "build", "lockin"].flatMap((k) => [...draft.phases[k].am, ...draft.phases[k].pm]);
  for (const s of added) assert.ok(!carried.has(s.text), `repeated: ${s.text}`);

  const next = buildPlan({
    draft: sanitizeDraft(draft),
    generatedBy: "rules",
    startDayKey: "2026-11-01",
    startedAt: new Date("2026-11-01T00:00:00Z"),
    focus: buildFocus(classifyProfile(u)),
    monthIndex: 2,
    totalMonths: 3,
  });
  assert.equal(next.monthIndex, 2);
  assert.equal(next.phases[0].name, "Carry on");
  assert.equal(plan.phases[0].name, "Foundation");
});

test("a carried retinoid still blocks a second strong active", () => {
  const u = user({ concerns: [{ key: "acne", rating: 2 }, { key: "radiance", rating: 2 }] });
  const carry = {
    am: [{ text: "Cleanse with a gentle cleanser" }, { text: "Moisturise" }, { text: "Apply broad-spectrum sunscreen, SPF 30 or higher" }],
    pm: [{ text: "Cleanse your face" }, { text: "Apply a pea-size amount of adapalene (an over-the-counter retinoid) to dry skin two evenings a week, then moisturise" }],
  };
  const draft = buildDraft(u, { carry, month: 2, totalMonths: 3 });
  const added = ["target", "build", "lockin"].flatMap((k) => [...draft.phases[k].am, ...draft.phases[k].pm]).map((s) => s.text.toLowerCase());
  assert.ok(!added.some((t) => /retinol|retinoid|adapalene|lactic|mandelic|salicylic|bha|aha/.test(t)));
});
