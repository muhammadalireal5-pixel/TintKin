import test from "node:test";
import assert from "node:assert/strict";
import { classifyProfile, buildDraft, buildFocus, gentleAlternative } from "../lib/plan/engine.js";
import { sanitizeDraft, buildPlan } from "../lib/plan/build.js";
import { getStepsForDay, applyAdjustment, toPlanView } from "../lib/plan/state.js";
import {
  composeDay,
  computeReadiness,
  applyReaction,
  advanceLadders,
  upgradeToCoach,
  nightsPerWeek,
  ladderState,
  isScheduledOn,
} from "../lib/plan/coach.js";
import { carryOverSteps } from "../lib/plan/review.js";
import { conflicts, INGREDIENT_CLASSES, LADDERS } from "../lib/plan/knowledge.js";

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

const planFor = (u, coach = true) => ({
  _id: "p1",
  ...buildPlan({
    draft: sanitizeDraft(buildDraft(u)),
    generatedBy: "rules",
    goals: [],
    startDayKey: "2026-10-01",
    startedAt: new Date("2026-10-01T00:00:00Z"),
    focus: buildFocus(classifyProfile(u)),
    coach,
  }),
});

const ids = (list) => list.map((s) => s.id);
const retinoidOf = (plan) => plan.steps.find((s) => s.cls === "retinoid");
const scheduledDays = (plan, step, from, to) => {
  const out = [];
  for (let d = from; d <= to; d++) if (isScheduledOn(plan, step, d)) out.push(d);
  return out;
};
const allDone = () => true;

test("a coached plan gives actives a class, a ladder and a starting rung", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  assert.ok(retinoid, "acne gets adapalene");
  assert.equal(retinoid.ladder, "retinoid");
  assert.equal(retinoid.startRung, 1);
  assert.doesNotMatch(retinoid.text, /evenings a week|once a week/);
  assert.equal(plan.coach.version, 1);
  const cleanser = plan.steps.find((s) => /cleanse/i.test(s.text));
  assert.equal(cleanser.ladder, null);
});

test("medium sensitivity starts strong actives one rung lower", () => {
  const plan = planFor(user({}, { sensitivity: "medium" }));
  assert.equal(retinoidOf(plan).startRung, 0);
  assert.equal(nightsPerWeek(plan, retinoidOf(plan)), 1);
});

test("an active runs only on its rung's nights each week", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const days = scheduledDays(plan, retinoid, retinoid.startDay, retinoid.startDay + 13);
  assert.equal(days.length, 4);
  const base = plan.steps.find((s) => s.slot === "pm" && /cleanse/i.test(s.text));
  assert.equal(scheduledDays(plan, base, 1, 14).length, 14);
});

test("an off night shows the active as resting with its next night", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const off = [...Array(7).keys()].map((i) => retinoid.startDay + i).find((d) => !isScheduledOn(plan, retinoid, d));
  const day = composeDay(plan, off);
  const rest = day.off.find((o) => o.step.id === retinoid.id);
  assert.equal(rest.reason, "rest");
  assert.ok(rest.nextDay > off);
  assert.ok(!ids(day.pm).includes(retinoid.id));
});

test("conflicting actives never share a night in the same slot", () => {
  const plan = planFor(user());
  const acid = { id: "s90", slot: "pm", text: "Use a 2% salicylic acid (BHA) treatment, then moisturise", why: "", metric: "pores", cls: "acid", ladder: "acid", startRung: 2, startDay: 8, endDay: null };
  plan.steps.push(acid);
  for (let d = 1; d <= 30; d++) {
    const pm = composeDay(plan, d).pm.filter((s) => s.ladder);
    for (let i = 0; i < pm.length; i++) for (let j = i + 1; j < pm.length; j++) {
      assert.ok(!conflicts(pm[i].cls, pm[j].cls), `day ${d}: ${pm[i].cls} with ${pm[j].cls}`);
    }
  }
});

test("a plan made before the coach is untouched by the composer", () => {
  const plan = planFor(user(), false);
  assert.equal(plan.coach, undefined);
  const day = getStepsForDay(plan, 10);
  const live = plan.steps.filter((s) => s.startDay <= 10 && s.endDay == null);
  assert.equal(day.am.length + day.pm.length, live.length);
  assert.equal(toPlanView(plan, "2026-10-10").coach, null);
});

test("upgrading an older plan keeps ids and turns frequency words into a rung", () => {
  const old = planFor(user(), false);
  const before = old.steps.find((s) => /adapalene/.test(s.text));
  old.steps = old.steps.map((s) => (s.id === before.id ? { ...s, text: "Apply a pea-size amount of adapalene to dry skin two evenings a week, then moisturise", cls: undefined, ladder: undefined, startRung: undefined } : s));
  const up = upgradeToCoach(old);
  const after = up.steps.find((s) => s.id === before.id);
  assert.equal(after.ladder, "retinoid");
  assert.equal(after.startRung, 1);
  assert.equal(after.text, "Apply a pea-size amount of adapalene to dry skin, then moisturise");
  assert.deepEqual(up.steps.map((s) => s.id), old.steps.map((s) => s.id));
});

test("readiness is green on an ordinary day and amber while an active is new", () => {
  const plan = planFor(user());
  assert.equal(computeReadiness(plan, 3).level, "green");
  const r = computeReadiness(plan, retinoidOf(plan).startDay + 1);
  assert.equal(r.level, "amber");
  assert.ok(r.reasons.length);
});

test("short sleep or high stress makes the day amber", () => {
  const plan = planFor(user());
  assert.equal(computeReadiness(plan, 3, { lifestyle: { sleep: "under6" } }).level, "amber");
  assert.equal(computeReadiness(plan, 3, { lifestyle: { stress: "high" } }).level, "amber");
});

test("irritation pauses every active for three days and drops each ladder a rung", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const day = retinoid.startDay + 5;
  const out = applyReaction(plan, { day, level: "irritated", slot: "pm" });
  assert.equal(out.serious, true);
  const next = { ...plan, coach: out.coach };
  for (let d = day; d <= day + 3; d++) {
    assert.equal(computeReadiness(next, d).level, "red");
    assert.ok(composeDay(next, d).pm.every((s) => !s.ladder), `day ${d} is barrier only`);
  }
  assert.notEqual(computeReadiness(next, day + 4).level, "red");
  assert.equal(ladderState(next, retinoid).rung, 0);
  assert.equal(ladderState(next, retinoid).since, day + 4);
});

test("a fine or tingle reaction changes no rung and pauses nothing", () => {
  const plan = planFor(user());
  const day = retinoidOf(plan).startDay + 3;
  for (const level of ["fine", "tingle"]) {
    const out = applyReaction(plan, { day, level, slot: "pm" });
    assert.equal(out.serious, false);
    assert.equal(out.coach.pausedUntilDay, null);
    assert.equal(ladderState({ ...plan, coach: out.coach }, retinoidOf(plan)).rung, 1);
  }
});

test("a second serious reaction to the same class within two weeks asks for a swap", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const first = scheduledDays(plan, retinoid, retinoid.startDay, retinoid.startDay + 6)[0];
  const once = applyReaction(plan, { day: first, level: "irritated", slot: "pm" });
  assert.deepEqual(once.repeatClasses, []);
  const next = { ...plan, coach: once.coach };
  const again = scheduledDays(next, retinoid, first + 4, first + 13)[0];
  const twice = applyReaction(next, { day: again, level: "breakout", slot: "pm" });
  assert.deepEqual(twice.repeatClasses, ["retinoid"]);
  assert.ok(twice.suspectIds.includes(retinoid.id));
});

test("the gentle swap for acne is azelaic acid, never another strong active", () => {
  const u = user();
  const plan = planFor(u);
  const live = plan.steps.filter((s) => s.startDay === 1);
  const alt = gentleAlternative(u, "acne", live);
  assert.ok(alt);
  assert.match(alt.text, /azelaic/i);
  const crowded = gentleAlternative(u, "acne", plan.steps.filter((s) => s.cls !== "retinoid"));
  assert.ok(crowded === null || !INGREDIENT_CLASSES[crowded.cls ?? ""]?.strong);
});

test("stepping up needs 14 days on the rung and 70% of scheduled nights done", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const start = retinoid.startDay;
  const green = { readiness: { level: "green" } };
  assert.equal(advanceLadders(plan, start + 10, allDone, green), null);
  const up = advanceLadders(plan, start + 14, allDone, green);
  assert.ok(up);
  assert.deepEqual(up.steppedUp.map((s) => s.id), [retinoid.id]);
  assert.equal(up.coach.ladders[retinoid.id].rung, 2);
  assert.equal(advanceLadders(plan, start + 14, () => false, green), null);
});

test("no step-up on an amber day or after a tingle on the current rung", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const day = retinoid.startDay + 14;
  assert.equal(advanceLadders(plan, day, allDone, { readiness: { level: "amber" } }), null);
  const tingled = { ...plan, coach: applyReaction(plan, { day: retinoid.startDay + 5, level: "tingle", slot: "pm" }).coach };
  assert.equal(advanceLadders(tingled, day, allDone, { readiness: { level: "green" } }), null);
});

test("never a step-up within 14 days of a reaction", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  const day = retinoid.startDay + 5;
  const next = { ...plan, coach: applyReaction(plan, { day, level: "irritated", slot: "pm" }).coach };
  for (let d = day; d < day + 4 + LADDERS.retinoid.minDays; d++) {
    assert.equal(advanceLadders(next, d, allDone, { readiness: { level: "green" } }), null, `day ${d}`);
  }
});

test("steps added on a coached plan get their ladder from the text", () => {
  const plan = planFor(user());
  const out = applyAdjustment(plan, { add: { pm: [{ text: "Use a gentle PHA exfoliant, then moisturise", why: "" }] } }, 10);
  const added = out.steps.find((s) => s.id === out.adjustments.at(-1).added[0]);
  assert.equal(added.ladder, "acid");
  assert.equal(added.startRung, 0);
});

test("next month carries each active on the rung it reached", () => {
  const plan = planFor(user());
  const retinoid = retinoidOf(plan);
  plan.coach.ladders[retinoid.id] = { rung: 3, since: 20 };
  const carried = carryOverSteps(plan).pm.find((s) => /adapalene/.test(s.text));
  assert.equal(carried.startRung, 3);
});

test("simulation: 12 weeks of random reactions and skips keep every invariant", () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let person = 0; person < 40; person++) {
    const sensitivity = ["low", "medium"][person % 2];
    let plan = { ...planFor(user({}, { sensitivity })), durationDays: 84 };
    const ticks = new Map();
    let lastSerious = -Infinity;
    for (let day = 1; day <= 84; day++) {
      const readiness = computeReadiness(plan, day);
      const before = Object.fromEntries(plan.steps.filter((s) => s.ladder).map((s) => [s.id, ladderState(plan, s).rung]));
      const up = advanceLadders(plan, day, (d, id) => ticks.get(d)?.has(id) ?? false, { readiness });
      if (up) {
        assert.ok(day - lastSerious >= 4 + 14, "no step-up within 14 days after a pause");
        for (const s of up.steppedUp) assert.equal(up.coach.ladders[s.id].rung, before[s.id] + 1, "one rung at a time");
        plan = { ...plan, coach: up.coach };
      }
      const today = composeDay(plan, day);
      const strongPm = today.pm.filter((s) => INGREDIENT_CLASSES[s.cls]?.strong);
      assert.ok(strongPm.length <= 1, "never two strong actives on one night");
      if (readiness.level === "red") assert.ok([...today.am, ...today.pm].every((s) => !s.ladder), "red days are barrier only");
      ticks.set(day, new Set([...today.am, ...today.pm].filter(() => rand() < 0.8).map((s) => s.id)));
      if (rand() < 0.04) {
        const level = rand() < 0.5 ? "irritated" : "tingle";
        plan = { ...plan, coach: applyReaction(plan, { day, level, slot: "pm" }).coach };
        if (level === "irritated") lastSerious = day;
      }
    }
  }
});
