import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo-cloud";

const { getSafeRedirect } = await import("../lib/utils/redirect.js");
const { resolvePeriod } = await import("../lib/utils/quota-period.js");
const { normalizeTimezone, getLocalDayKey } = await import("../lib/utils/date.js");
const { isOwnedUserUpload, getUserUploadPrefix } = await import("../lib/utils/cloudinary.js");

test("getSafeRedirect keeps same-origin paths", () => {
  assert.equal(getSafeRedirect("/dashboard"), "/dashboard");
  assert.equal(getSafeRedirect("/what-if?mode=compare#top"), "/what-if?mode=compare#top");
});

test("getSafeRedirect rejects open-redirect payloads", () => {
  for (const payload of [
    "//evil.com",
    "/\t/evil.com", // browsers strip the tab -> "//evil.com"
    "/\n/evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    null,
    undefined,
  ]) {
    assert.equal(getSafeRedirect(payload), "/dashboard", `should reject ${JSON.stringify(payload)}`);
  }
});

test("resolvePeriod counts within the same period and resets on a newer one", () => {
  assert.deepEqual(resolvePeriod("2026-10-02", 1, "2026-10-02"), { key: "2026-10-02", count: 1 });
  assert.deepEqual(resolvePeriod("2026-10-02", 1, "2026-10-03"), { key: "2026-10-03", count: 0 });
  assert.deepEqual(resolvePeriod(undefined, undefined, "2026-10-02"), { key: "2026-10-02", count: 0 });
});

// Regression: alternating between far-apart timezones produced an *older*
// day key, which used to reset the counter and bypass the daily scan limit.
test("resolvePeriod never resets the counter for an older key", () => {
  assert.deepEqual(resolvePeriod("2026-10-03", 1, "2026-10-02"), { key: "2026-10-03", count: 1 });
  assert.deepEqual(resolvePeriod("2026-11", 4, "2026-10"), { key: "2026-11", count: 4 });

  const instant = new Date("2026-10-02T23:30:00Z");
  const east = getLocalDayKey("Pacific/Kiritimati", instant); // UTC+14
  const west = getLocalDayKey("Etc/GMT+12", instant); // UTC-12
  assert.notEqual(east, west);
  const afterEast = resolvePeriod(undefined, 0, east);
  const thenWest = resolvePeriod(afterEast.key, afterEast.count + 1, west);
  assert.equal(thenWest.count, 1, "switching to the western zone must not reset the count");
});

test("normalizeTimezone accepts IANA zones and falls back to UTC", () => {
  assert.equal(normalizeTimezone("Asia/Karachi"), "Asia/Karachi");
  assert.equal(normalizeTimezone("Not/AZone"), "UTC");
  assert.equal(normalizeTimezone(""), "UTC");
  assert.equal(normalizeTimezone(42), "UTC");
  assert.equal(normalizeTimezone("x".repeat(100)), "UTC");
});

test("isOwnedUserUpload only accepts the caller's uploads in our cloud", () => {
  const uid = "6abea34fdec8f17b162beb2d";
  const own = `https://res.cloudinary.com/demo-cloud/image/upload/v1/${getUserUploadPrefix(uid)}abc.jpg`;
  assert.equal(isOwnedUserUpload(own, uid), true);
  assert.equal(isOwnedUserUpload(own.replace("/v1/", "/s--AbCd12_---/"), uid), true);

  // Another user's upload in our cloud.
  assert.equal(isOwnedUserUpload(own, "000000000000000000000000"), false);
  // Same public id but a different Cloudinary account (or its fetch proxy).
  assert.equal(isOwnedUserUpload(own.replace("demo-cloud", "attacker"), uid), false);
  assert.equal(
    isOwnedUserUpload(`https://res.cloudinary.com/demo-cloud/image/fetch/https://evil.com/${getUserUploadPrefix(uid)}x.jpg`, uid),
    false
  );
  // Legacy, un-prefixed upload and non-Cloudinary hosts.
  assert.equal(isOwnedUserUpload("https://res.cloudinary.com/demo-cloud/image/upload/v1/abc.jpg", uid), false);
  assert.equal(isOwnedUserUpload(`https://yce-us.s3.amazonaws.com/${getUserUploadPrefix(uid)}a.jpg`, uid), false);
  assert.equal(isOwnedUserUpload("not a url", uid), false);
});
