import test from "node:test";
import assert from "node:assert/strict";
import { evaluateUserAchievements, MILESTONE_REWARDS } from "../app/lib/achievements.js";

const ids = (r) => r.newlyUnlockedIds;

test("a fresh user with one scan reaches only the first milestone", () => {
  const r = evaluateUserAchievements({ user: { scanCount: 1 }, selfieCount: 1 });
  assert.deepEqual(ids(r), ["first_glow"]);
});

test("days of care, not scan volume, drive the day milestones", () => {
  const manyScans = evaluateUserAchievements({ user: { scanCount: 40, activeDays: 2 }, selfieCount: 40 });
  assert.ok(!ids(manyScans).includes("thirty_days"));

  const thirtyDays = evaluateUserAchievements({ user: { scanCount: 5, activeDays: 30 }, selfieCount: 5 });
  assert.ok(ids(thirtyDays).includes("thirty_days"));
  assert.ok(ids(thirtyDays).includes("three_days"));
  assert.ok(!ids(thirtyDays).includes("sixty_days"));
});

test("routine week counts routine days, not today's log", () => {
  const r = evaluateUserAchievements({ user: { routineDays: 7 } });
  assert.ok(ids(r).includes("routine_week"));
});

test("held legacy badges stay unlocked and never re-award a reward", () => {
  const r = evaluateUserAchievements({ user: { badges: ["consistency_champion", "week_radiance"], scanCount: 30 }, selfieCount: 30 });
  const byId = Object.fromEntries(r.evaluatedAchievements.map((a) => [a.id, a]));
  assert.equal(byId.thirty_days.isUnlocked, true);
  assert.equal(byId.week_radiance.isUnlocked, true);
  assert.ok(!ids(r).includes("thirty_days"));
  assert.ok(!ids(r).includes("week_radiance"));
});

test("the improvement milestone compares a user only with their own start", () => {
  const base = { user: { scanCount: 8 }, selfieCount: 8, baselineScores: [60, 62, 61] };
  assert.ok(ids(evaluateUserAchievements({ ...base, recentScores: [66, 65, 67] })).includes("first_improvement"));
  assert.ok(!ids(evaluateUserAchievements({ ...base, recentScores: [62, 61, 63] })).includes("first_improvement"));
});

test("rewards are limited to the 7-day and 30-day milestones", () => {
  assert.deepEqual(Object.keys(MILESTONE_REWARDS).sort(), ["thirty_days", "week_radiance"]);
});
