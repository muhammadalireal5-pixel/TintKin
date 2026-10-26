import test from "node:test";
import assert from "node:assert/strict";
import { getFreshnessPrompt, validateCheckIn, lifestyleFromCheckIn, summarizeCheckIns, answersFromLog, DUPLICATE_WITHIN_DAYS } from "../lib/checkin/freshness.js";
import { buildLifestyleInputs } from "../lib/whatif/lifestyle.js";
import { assessReliability } from "../lib/whatif/reliability.js";

const NOW = new Date("2026-10-30T12:00:00Z");
const ago = (days) => new Date(NOW.getTime() - days * 86400000).toISOString();
const base = { now: NOW, hasProfile: true, accountCreatedAt: ago(200), profileRefreshedAt: ago(10), lastCheckInAt: ago(2) };

test("nothing is asked without a skin profile or in the first week", () => {
  assert.equal(getFreshnessPrompt({ ...base, hasProfile: false, lastCheckInAt: null }), null);
  assert.equal(getFreshnessPrompt({ ...base, accountCreatedAt: ago(3), profileRefreshedAt: null, lastCheckInAt: null }), null);
  assert.equal(getFreshnessPrompt({ ...base, accountCreatedAt: null }), null);
});

test("a weekly check-in is due a week after the last one, and not before", () => {
  assert.equal(getFreshnessPrompt({ ...base, lastCheckInAt: ago(6) }), null);
  const due = getFreshnessPrompt({ ...base, lastCheckInAt: ago(7) });
  assert.equal(due.kind, "weekly");
  assert.deepEqual(due.fields, ["sleep", "stress", "outdoor"]);
});

test("a person who has never checked in is asked once their account is a week old", () => {
  assert.equal(getFreshnessPrompt({ ...base, lastCheckInAt: null }).kind, "weekly");
});

test("the quarterly refresh also asks about smoking and replaces the weekly one", () => {
  const q = getFreshnessPrompt({ ...base, profileRefreshedAt: ago(91), lastCheckInAt: ago(20) });
  assert.equal(q.kind, "quarterly");
  assert.ok(q.fields.includes("smoker"));
  assert.equal(getFreshnessPrompt({ ...base, profileRefreshedAt: ago(89), lastCheckInAt: ago(2) }), null);
});

test("an account that never recorded a refresh counts from when it was created", () => {
  assert.equal(getFreshnessPrompt({ ...base, profileRefreshedAt: null, accountCreatedAt: ago(100) }).kind, "quarterly");
  assert.equal(getFreshnessPrompt({ ...base, profileRefreshedAt: null, accountCreatedAt: ago(60), lastCheckInAt: ago(1) }), null);
});

test("answers are checked against the offered options", () => {
  assert.deepEqual(validateCheckIn({ sleep: "under6", stress: "high", outdoor: "lots" }, "weekly"), { sleep: "under6", stress: "high", outdoor: "lots" });
  assert.equal(validateCheckIn({ sleep: "under6", stress: "high" }, "weekly"), null);
  assert.equal(validateCheckIn({ sleep: "9h", stress: "high", outdoor: "lots" }, "weekly"), null);
  assert.equal(validateCheckIn({ sleep: "under6", stress: "high", outdoor: "lots" }, "quarterly"), null);
  assert.equal(validateCheckIn({ sleep: "7plus", stress: "low", outdoor: "some", smoker: "no" }, "quarterly"), null);
  assert.deepEqual(validateCheckIn({ sleep: "7plus", stress: "low", outdoor: "some", smoker: false, extra: 1 }, "quarterly"), { sleep: "7plus", stress: "low", outdoor: "some", smoker: false });
  assert.equal(validateCheckIn({}, "nonsense"), null);
  assert.equal(validateCheckIn(null, "weekly"), null);
});

test("a check-in becomes a lifestyle entry in the units the projection uses", () => {
  const doc = lifestyleFromCheckIn({ sleep: "under6", stress: "high", outdoor: "lots" }, NOW);
  assert.deepEqual(doc, { date: NOW, sleepHours: 5.5, stressLevel: "high", uvMinutes: 60 });
  assert.ok(DUPLICATE_WITHIN_DAYS >= 1);
});

const log = (days, over) => ({ date: ago(days), sleepHours: 6.5, stressLevel: "medium", uvMinutes: 25, ...over });

test("recent check-ins are averaged and snapped to the offered options", () => {
  const s = summarizeCheckIns([log(2, { sleepHours: 5.5 }), log(9, { sleepHours: 5.5 }), log(16, { sleepHours: 7.5 })], NOW);
  assert.equal(s.count, 3);
  assert.equal(s.sleepHours, 6.5);
  assert.equal(s.uvMinutes, 25);
  assert.equal(s.stressLevel, "medium");
});

test("only the last 30 days and at most five entries count", () => {
  const old = log(45, { sleepHours: 5.5, stressLevel: "high" });
  assert.equal(summarizeCheckIns([old], NOW), null);
  const many = Array.from({ length: 8 }, (_, i) => log(i + 1));
  assert.equal(summarizeCheckIns(many, NOW).count, 5);
  assert.equal(summarizeCheckIns([], NOW), null);
});

test("on a stress tie the higher level wins, and bad values are ignored", () => {
  const s = summarizeCheckIns([log(1, { stressLevel: "low" }), log(2, { stressLevel: "high" }), log(3, { stressLevel: "nonsense", sleepHours: "x" })], NOW);
  assert.equal(s.stressLevel, "high");
  assert.equal(s.sleepHours, 6.5);
});

test("a past check-in pre-fills the next one", () => {
  assert.deepEqual(answersFromLog({ sleepHours: 5.5, stressLevel: "high", uvMinutes: 60 }), { sleep: "under6", stress: "high", outdoor: "lots" });
  assert.deepEqual(answersFromLog(null), {});
});

const profile = { sleep: "7plus", outdoor: "indoors", smoker: false, stress: "low", currentProducts: [] };

test("what-if inputs prefer recent check-ins over the profile, and say so", () => {
  const checkIns = summarizeCheckIns([log(1, { sleepHours: 5.5, stressLevel: "high", uvMinutes: 60 }), log(8, { sleepHours: 5.5, stressLevel: "high", uvMinutes: 60 })], NOW);
  const { values, sources, details } = buildLifestyleInputs({ skinProfile: profile, checkIns });
  assert.equal(values.sleepHours, 5.5);
  assert.equal(values.stressLevel, "high");
  assert.equal(values.uvMinutes, 60);
  assert.equal(sources.sleepHours, "checkins");
  assert.match(details.sleepHours, /last 2 check-ins/);
  assert.equal(sources.smokeCigarettes, "profile");
});

test("an override still beats a check-in, and no check-ins leaves the profile in charge", () => {
  const checkIns = { count: 1, sleepHours: 5.5 };
  const over = buildLifestyleInputs({ skinProfile: profile, checkIns, overrides: { sleepHours: 7.5 } });
  assert.equal(over.values.sleepHours, 7.5);
  assert.equal(over.sources.sleepHours, "override");
  const none = buildLifestyleInputs({ skinProfile: profile, checkIns: null });
  assert.equal(none.sources.sleepHours, "profile");
});

test("check-in sourced inputs count as known for reliability", () => {
  const sources = { sleepHours: "checkins", spfUsed: "profile", uvMinutes: "checkins", smokeCigarettes: "profile" };
  assert.equal(assessReliability({ velocitySource: "user", sources }).scores, "high");
});
