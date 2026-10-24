import test from "node:test";
import assert from "node:assert/strict";
import { computeTarget, pickFocus, sanitizeDraft, sanitizeAdjustment, fallbackDraft, buildPlan } from "../lib/plan/build.js";
import {
  getPlanDay,
  isPlanExpired,
  getPhaseForDay,
  getStepsForDay,
  getNewStepIds,
  getNextCheckIn,
  applyScanToPlan,
  getProgress,
  applyAdjustment,
  toPlanView,
} from "../lib/plan/state.js";
import { PLAN_LIMITS } from "../lib/constants/plan.js";

const SCORES = { wrinkles: 70, firmness: 64, spots: 55, radiance: 48 };
const START = new Date("2026-10-23T09:00:00Z");

const aiDraft = () => ({
  summary: "Focus on radiance and even tone.",
  phases: {
    foundation: {
      am: [{ text: "Cleanse", why: "Clean base", metric: null }, { text: "Moisturise", why: "Barrier" }, { text: "Sunscreen", why: "UV" }],
      pm: [{ text: "Cleanse", why: "Remove the day" }, { text: "Moisturise", why: "Repair" }],
    },
    target: { am: [], pm: [{ text: "Gentle exfoliant twice a week", why: "Dull skin", metric: "radiance" }] },
    build: { am: [{ text: "Brightening serum", why: "Even tone", metric: "spots" }], pm: [] },
    lockin: { am: [], pm: [] },
  },
});

const makePlan = (overrides = {}) =>
  ({
    ...buildPlan({ draft: sanitizeDraft(aiDraft()), scores: SCORES, overallScore: 62, skinAge: 31, goals: ["Glow"], startDayKey: "2026-10-23", startedAt: START }),
    ...overrides,
  });

test("computeTarget aims for a realistic gain and never reaches perfect", () => {
  assert.equal(computeTarget(48), 56);
  assert.equal(computeTarget(90), 93);
  assert.equal(computeTarget(98), 95);
  assert.equal(computeTarget(100), 95);
});

test("pickFocus takes the two weakest scored metrics", () => {
  const focus = pickFocus(SCORES);
  assert.deepEqual(focus.map((f) => f.metric), ["radiance", "spots"]);
  assert.deepEqual(focus[0], { metric: "radiance", label: "Radiance", baseline: 48, target: 56 });
  assert.deepEqual(pickFocus({ wrinkles: null, firmness: 80 }).map((f) => f.metric), ["firmness"]);
  assert.deepEqual(pickFocus({}), []);
});

test("sanitizeDraft bounds, trims and de-duplicates AI output", () => {
  const long = "x".repeat(500);
  const draft = sanitizeDraft({
    summary: `  ${long}  `,
    phases: {
      foundation: {
        am: ["  Cleanse  ", "cleanse", { text: "", why: "no text" }, 42, null, { text: long, why: long, metric: "bogus" }],
        pm: Array.from({ length: 12 }, (_, i) => ({ text: `step ${i}` })),
      },
      target: { am: Array.from({ length: 5 }, (_, i) => ({ text: `add ${i}` })) },
    },
  });
  assert.equal(draft.summary.length, PLAN_LIMITS.summaryLength);
  assert.deepEqual(draft.phases.foundation.am.map((s) => s.text.length > 100 ? "long" : s.text), ["Cleanse", "long"]);
  assert.equal(draft.phases.foundation.am[1].metric, null);
  assert.equal(draft.phases.foundation.am[1].why.length, PLAN_LIMITS.whyLength);
  assert.equal(draft.phases.foundation.pm.length, PLAN_LIMITS.stepsPerSlot);
  assert.equal(draft.phases.target.am.length, PLAN_LIMITS.addsPerPhase);
  assert.deepEqual(draft.phases.lockin, { am: [], pm: [] });
});

test("sanitizeAdjustment keeps only well-formed step ids and bounded additions", () => {
  const adj = sanitizeAdjustment({
    note: "  Simplified  ",
    drop: ["s2", "s2", "../etc", 7, "s99999", "s3"],
    add: { am: [{ text: "A" }, { text: "B" }, { text: "C" }], pm: "nope" },
  });
  assert.equal(adj.note, "Simplified");
  assert.deepEqual(adj.drop, ["s2", "s3"]);
  assert.equal(adj.add.am.length, PLAN_LIMITS.addsPerPhase);
  assert.deepEqual(adj.add.pm, []);
  assert.deepEqual(sanitizeAdjustment(null), { note: "", drop: [], add: { am: [], pm: [] } });
});

test("buildPlan gives every step a unique, stable id and later phases only add", () => {
  const plan = makePlan();
  assert.equal(plan.generatedBy, "ai");
  assert.equal(plan.durationDays, 30);
  assert.equal(new Set(plan.steps.map((s) => s.id)).size, plan.steps.length);
  assert.deepEqual(plan.steps.map((s) => [s.id, s.slot, s.startDay]), [
    ["s1", "am", 1], ["s2", "am", 1], ["s3", "am", 1],
    ["s4", "pm", 1], ["s5", "pm", 1],
    ["s6", "pm", 8],
    ["s7", "am", 15],
  ]);
  assert.deepEqual(plan.checkIns.map((c) => [c.day, c.status]), [[7, "upcoming"], [14, "upcoming"], [28, "upcoming"]]);
  assert.equal(plan.checkIns[0].dueAt.toISOString(), "2026-10-29T09:00:00.000Z");
  assert.equal(plan.endsAt.toISOString(), "2026-11-22T09:00:00.000Z");
  assert.equal(plan.baseline.overallScore, 62);
  assert.equal(plan.latest.scores.radiance, 48);
  assert.deepEqual(plan.focus.map((f) => f.metric), ["radiance", "spots"]);
});

test("buildPlan falls back to the rule-based plan when the draft has no base routine", () => {
  for (const draft of [null, sanitizeDraft({}), sanitizeDraft({ phases: { foundation: { am: ["Cleanse"], pm: [] } } })]) {
    const plan = buildPlan({ draft, scores: SCORES, startDayKey: "2026-10-23", startedAt: START });
    assert.equal(plan.generatedBy, "fallback");
    assert.ok(plan.steps.some((s) => s.slot === "am" && s.startDay === 1));
    assert.ok(plan.steps.some((s) => s.slot === "pm" && s.startDay === 1));
    assert.ok(plan.steps.some((s) => s.metric === "radiance"), "targets the weakest metric");
    assert.ok(plan.summary.includes("radiance"));
  }
  assert.ok(fallbackDraft({}).phases.foundation.am.length >= 3);
});

test("plan day is counted from local day keys", () => {
  const plan = makePlan();
  assert.equal(getPlanDay(plan, "2026-10-23"), 1);
  assert.equal(getPlanDay(plan, "2026-11-01"), 10);
  assert.equal(getPlanDay(plan, "2026-10-22"), 0);
  assert.equal(isPlanExpired(plan, "2026-11-21"), false); // day 30
  assert.equal(isPlanExpired(plan, "2026-11-22"), true); // day 31
});

test("steps appear as the plan reaches their phase", () => {
  const plan = makePlan();
  const texts = (day) => {
    const s = getStepsForDay(plan, day);
    return [s.am.length, s.pm.length];
  };
  assert.deepEqual(texts(1), [3, 2]);
  assert.deepEqual(texts(7), [3, 2]);
  assert.deepEqual(texts(8), [3, 3]);
  assert.deepEqual(texts(15), [4, 3]);
  assert.deepEqual(texts(99), [4, 3]); // clamped to the last day
  assert.equal(getPhaseForDay(plan, 9).key, "target");
  assert.equal(getPhaseForDay(plan, 30).key, "lockin");
  assert.deepEqual(getNewStepIds(plan, 9), ["s6"]);
  assert.deepEqual(getNewStepIds(plan, 16), ["s7"]);
  assert.deepEqual(getNewStepIds(plan, 3), []);
});

test("a baseline scan on day 1 never completes a check-in", () => {
  const plan = makePlan();
  const r = applyScanToPlan(plan, { selfieId: "a", takenAt: START, overallScore: 62, scores: SCORES }, 1);
  assert.equal(r.completedDay, null);
  assert.ok(r.checkIns.every((c) => c.status === "upcoming"));
});

test("a scan in the week-one window completes the day-7 check-in", () => {
  const plan = makePlan();
  const scan = { selfieId: "b", takenAt: new Date("2026-10-31T09:00:00Z"), overallScore: 66, scores: { ...SCORES, radiance: 53 } };
  const early = applyScanToPlan(plan, scan, 4);
  assert.equal(early.completedDay, null, "day 4 is too early");
  assert.equal(early.latest.scores.radiance, 53, "but latest still updates");

  const r = applyScanToPlan(plan, scan, 9);
  assert.equal(r.completedDay, 7);
  assert.deepEqual(r.checkIns.map((c) => c.status), ["done", "upcoming", "upcoming"]);
  assert.equal(r.checkIns[0].overallScore, 66);
  assert.equal(r.checkIns[0].selfieId, "b");
  assert.equal(plan.checkIns[0].status, "upcoming", "input is not mutated");
});

test("a late scan marks skipped check-ins missed and counts for the latest due one", () => {
  const plan = makePlan();
  const r = applyScanToPlan(plan, { selfieId: "c", takenAt: START, overallScore: 70, scores: SCORES }, 15);
  assert.equal(r.completedDay, 14);
  assert.deepEqual(r.checkIns.map((c) => c.status), ["missed", "done", "upcoming"]);
  assert.equal(getNextCheckIn({ checkIns: r.checkIns }).day, 28);

  const early28 = applyScanToPlan({ ...plan, checkIns: r.checkIns }, { selfieId: "d", takenAt: START, overallScore: 70, scores: SCORES }, 26);
  assert.equal(early28.completedDay, 28, "day 28 can be done two days early");
});

test("progress measures movement toward each target", () => {
  const plan = makePlan({ latest: { selfieId: "x", at: START, overallScore: 66, scores: { ...SCORES, radiance: 52, spots: 53 } } });
  const p = getProgress(plan);
  const radiance = p.focus.find((f) => f.metric === "radiance");
  assert.equal(radiance.delta, 4);
  assert.equal(radiance.percentToTarget, 50); // 48 -> 56, now 52
  const spots = p.focus.find((f) => f.metric === "spots");
  assert.equal(spots.delta, -2);
  assert.equal(spots.percentToTarget, 0, "never negative");
  assert.equal(p.overallDelta, 4);
  assert.equal(p.targetsReached, false);

  const done = getProgress(makePlan({ latest: { scores: { ...SCORES, radiance: 70, spots: 70 }, overallScore: 80 } }));
  assert.equal(done.targetsReached, true);
  assert.ok(done.focus.every((f) => f.percentToTarget === 100));
});

test("an adjustment ends dropped steps today and starts new ones tomorrow", () => {
  const plan = makePlan();
  const changes = applyAdjustment(
    plan,
    { note: "Simplified", drop: ["s2", "s404"], add: { am: [{ text: "Hydrating serum", why: "Dry", metric: "wrinkles" }], pm: [] } },
    9,
    { selfieId: "z", checkInDay: 7 }
  );
  const byId = Object.fromEntries(changes.steps.map((s) => [s.id, s]));
  assert.equal(byId.s2.endDay, 9);
  assert.equal(byId.s1.endDay, null);
  assert.equal(byId.s8.startDay, 10);
  assert.equal(byId.s8.text, "Hydrating serum");
  assert.equal(changes.version, 2);
  assert.deepEqual(changes.adjustments[0].dropped, ["s2"]);
  assert.deepEqual(changes.adjustments[0].added, ["s8"]);
  assert.equal(changes.adjustments[0].checkInDay, 7);

  const next = { ...plan, ...changes };
  assert.equal(getStepsForDay(next, 9).am.some((s) => s.id === "s2"), true, "still there today");
  assert.equal(getStepsForDay(next, 10).am.some((s) => s.id === "s2"), false, "gone tomorrow");
  assert.equal(getStepsForDay(next, 10).am.some((s) => s.id === "s8"), true);
});

test("an adjustment respects the per-slot step limit and skips duplicates", () => {
  const plan = makePlan();
  const many = Array.from({ length: 10 }, (_, i) => ({ text: `Extra ${i}` }));
  const changes = applyAdjustment(plan, { add: { am: [{ text: "cleanse" }, ...many], pm: [] } }, 5);
  const am = changes.steps.filter((s) => s.slot === "am" && s.endDay == null && s.startDay <= 6);
  assert.equal(am.length <= PLAN_LIMITS.stepsPerSlot, true);
  assert.equal(changes.steps.filter((s) => s.text.toLowerCase() === "cleanse" && s.slot === "am").length, 1, "duplicate of an active step is skipped");
});

test("toPlanView is JSON-safe and carries today's steps and the next check-in", () => {
  const plan = { ...makePlan(), _id: { toString: () => "abc123" } };
  const view = toPlanView(plan, "2026-10-30"); // day 8
  assert.equal(view.id, "abc123");
  assert.equal(view.day, 8);
  assert.equal(view.daysLeft, 22);
  assert.equal(view.phase.key, "target");
  assert.equal(view.steps.pm.length, 3);
  assert.deepEqual(view.newStepIds, ["s6"]);
  assert.deepEqual(view.nextCheckIn, { day: 7, dueAt: "2026-10-29T09:00:00.000Z", isDue: true });
  assert.equal(view.expired, false);
  assert.equal(view.pendingReview, false);
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);

  const scan = { selfieId: "b", takenAt: new Date("2026-10-31T09:00:00Z"), overallScore: 66, scores: SCORES };
  const done = { ...plan, ...(({ checkIns, latest }) => ({ checkIns, latest }))(applyScanToPlan(plan, scan, 9)) };
  assert.equal(toPlanView(done, "2026-10-31").pendingReview, true, "a done check-in awaits the coach");
  const answered = { ...done, adjustments: [{ version: 2, day: 9, checkInDay: 7, note: "ok" }] };
  assert.equal(toPlanView(answered, "2026-10-31").pendingReview, false);

  const late = toPlanView(plan, "2026-12-30");
  assert.equal(late.expired, true);
  assert.equal(late.day, 30);
});

test("the what's-new announcement shows once, and only to accounts older than the cutoff", async () => {
  const { shouldShowAnnouncement, CURRENT_ANNOUNCEMENT } = await import("../lib/constants/announcements.js");
  const old = { createdAt: "2026-09-01T00:00:00Z", seenAnnouncements: [] };
  assert.equal(shouldShowAnnouncement(old), true);
  assert.equal(shouldShowAnnouncement({ ...old, seenAnnouncements: [CURRENT_ANNOUNCEMENT.id] }), false);
  assert.equal(shouldShowAnnouncement({ ...old, seenAnnouncements: ["something-else"] }), true);
  assert.equal(shouldShowAnnouncement({ createdAt: "2026-12-01T00:00:00Z" }), false, "new accounts never knew the old app");
  assert.equal(shouldShowAnnouncement({}), false);
});
