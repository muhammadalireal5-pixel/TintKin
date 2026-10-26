import test from "node:test";
import assert from "node:assert/strict";
import { buildLifestyleInputs, countSunscreenDays, DEFAULT_LIFESTYLE, MIN_TRACKED_DAYS } from "../lib/whatif/lifestyle.js";
import { assessReliability, presentScore, presentDelta, SCORE_BAND } from "../lib/whatif/reliability.js";
import { projectTrajectory } from "../app/lib/predict.js";

const profile = (over = {}) => ({ sleep: "under6", outdoor: "lots", smoker: true, stress: "high", currentProducts: ["cleanser"], ...over });
const dayKeyOf = (d) => d.toISOString().slice(0, 10);
const steps = [{ id: "s1", text: "Cleanse" }, { id: "s3", text: "Apply broad-spectrum sunscreen, SPF 30 or higher" }];
const log = (date, am = [], pm = []) => ({ date, amCompleted: am, pmCompleted: pm });

test("confirmed: with no profile and no ticks every input is the assumed default", () => {
  const { values, sources } = buildLifestyleInputs({});
  assert.deepEqual(values, { ...DEFAULT_LIFESTYLE });
  assert.ok(Object.values(sources).every((s) => s === "default"));
});

test("profile answers replace the defaults and are tagged as profile", () => {
  const { values, sources } = buildLifestyleInputs({ skinProfile: profile() });
  assert.equal(values.sleepHours, 5.5);
  assert.equal(values.uvMinutes, 60);
  assert.equal(values.smokeCigarettes, 10);
  assert.equal(values.spfUsed, false);
  assert.equal(sources.sleepHours, "profile");
  assert.equal(sources.uvMinutes, "profile");
  assert.equal(sources.smokeCigarettes, "profile");
  assert.equal(sources.spfUsed, "profile");
  assert.equal(sources.sugarServings, "default");
  assert.equal(sources.exerciseMinutes, "default");
});

test("a profile that lists sunscreen counts as using it until ticks say otherwise", () => {
  const { values, sources } = buildLifestyleInputs({ skinProfile: profile({ currentProducts: ["sunscreen"] }) });
  assert.equal(values.spfUsed, true);
  assert.equal(sources.spfUsed, "profile");
});

test("ticks beat the profile once there are enough tracked days", () => {
  const sunscreen = { hasSunscreenStep: true, sunscreenDays: 2, trackedDays: 14 };
  const { values, sources, details } = buildLifestyleInputs({ skinProfile: profile({ currentProducts: ["sunscreen"] }), sunscreen });
  assert.equal(values.spfUsed, false);
  assert.equal(sources.spfUsed, "ticks");
  assert.match(details.spfUsed, /2 of the last 14/);
});

test("sparse ticks (under a week) fall back to the profile instead of guessing", () => {
  const sunscreen = { hasSunscreenStep: true, sunscreenDays: 3, trackedDays: MIN_TRACKED_DAYS - 1 };
  const { sources } = buildLifestyleInputs({ skinProfile: profile(), sunscreen });
  assert.equal(sources.spfUsed, "profile");
});

test("no sunscreen step in the plan means ticks say nothing", () => {
  const sunscreen = { hasSunscreenStep: false, sunscreenDays: 0, trackedDays: 30 };
  const { sources } = buildLifestyleInputs({ sunscreen });
  assert.equal(sources.spfUsed, "default");
});

test("counts the days a sunscreen step was ticked, inside the window only", () => {
  const logs = [
    log("2026-10-01T09:00:00Z", ["s1", "s3"]),
    log("2026-10-02T09:00:00Z", ["s1"]),
    log("2026-10-03T20:00:00Z", [], ["s3"]),
    log("2026-09-20T09:00:00Z", ["s3"]),
  ];
  const out = countSunscreenDays({ steps, logs, dayKeyOf, windowStartKey: "2026-10-01", todayKey: "2026-10-10" });
  assert.deepEqual(out, { sunscreenDays: 2, trackedDays: 10, hasSunscreenStep: true });
});

test("overrides win, but only values the UI offers are accepted", () => {
  const { values, sources } = buildLifestyleInputs({
    skinProfile: profile(),
    overrides: { sleepHours: 7.5, smokeCigarettes: 999, nonsense: 1, spfUsed: "yes" },
  });
  assert.equal(values.sleepHours, 7.5);
  assert.equal(sources.sleepHours, "override");
  assert.equal(values.smokeCigarettes, 10);
  assert.equal(sources.smokeCigarettes, "profile");
  assert.equal(sources.spfUsed, "profile");
});

test("reliability: scan history and known inputs both have to be there for full numbers", () => {
  const known = { sleepHours: "profile", spfUsed: "ticks", uvMinutes: "profile", smokeCigarettes: "profile" };
  assert.equal(assessReliability({ velocitySource: "user", sources: known }).scores, "high");
  assert.equal(assessReliability({ velocitySource: "blended", sources: known }).scores, "limited");
  assert.equal(assessReliability({ velocitySource: "baseline", sources: known }).scores, "low");
  assert.equal(assessReliability({ velocitySource: "user", sources: { ...known, uvMinutes: "default" } }).scores, "limited");
  assert.equal(assessReliability({ velocitySource: "user", sources: { ...known, uvMinutes: "default", sleepHours: "default" } }).scores, "low");
});

test("reliability: skin age depends on inputs only, and an override counts as known", () => {
  const sources = { sleepHours: "override", spfUsed: "override", uvMinutes: "override", smokeCigarettes: "override" };
  const r = assessReliability({ velocitySource: "baseline", sources });
  assert.equal(r.skinAge, "high");
  assert.equal(r.scores, "low");
  assert.deepEqual(r.assumedInputs, []);
});

test("presentation: hidden when low, a range when limited, exact when high", () => {
  assert.equal(presentScore(70.4, "low").hidden, true);
  assert.equal(presentDelta(1.2, "low").hidden, true);
  assert.equal(presentScore(70.4, "limited").text, "about 70");
  assert.equal(presentDelta(1, "limited").text, `${1 - SCORE_BAND} to +${1 + SCORE_BAND}`);
  assert.equal(presentDelta(-1, "limited").text, `${-1 - SCORE_BAND} to +${-1 + SCORE_BAND}`);
  assert.equal(presentScore(70.4, "high").text, "70.4");
  assert.equal(presentDelta(1.2, "high").text, "+1.2");
});

test("real inputs change the projection; defaults never did", () => {
  const baseline = { wrinkles: 70, firmness: 70, spots: 70, radiance: 70 };
  const defaults = projectTrajectory(baseline, 1, { ...buildLifestyleInputs({}).values }, [], []);
  const mine = buildLifestyleInputs({ skinProfile: profile() });
  const real = projectTrajectory(baseline, 1, { ...mine.values }, [], []);
  assert.ok(real.lifestyleMultiplier > defaults.lifestyleMultiplier);
  assert.ok(real.scores.wrinkles < defaults.scores.wrinkles);
});

test("the source of the inputs is passed through to the projection meta", () => {
  const out = projectTrajectory({ wrinkles: 70 }, 1, { ...buildLifestyleInputs({}).values, source: "user" }, [], []);
  assert.equal(out.meta.lifestyleSource, "user");
  const fallback = projectTrajectory({ wrinkles: 70 }, 1, { sleepHours: 8 }, [], []);
  assert.equal(fallback.meta.lifestyleSource, "partial");
});

test("sparse scan history reports the baseline velocity the reliability check keys on", () => {
  const one = projectTrajectory({ wrinkles: 70 }, 1, {}, [], [{ takenAt: "2026-10-01", scores: { wrinkles: 70 } }]);
  assert.equal(one.meta.velocitySource, "baseline");
});
