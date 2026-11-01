import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const { simulateSkin, analyzeSkin, youcamTiming } = await import("../app/lib/youcam.js");

Object.assign(youcamTiming, { firstPollMs: 0, pollEveryMs: 0, rateLimitBackoffMs: 1 });

const SOURCE = "https://res.cloudinary.com/demo-cloud/image/upload/v1/abc123.jpg";
const realFetch = globalThis.fetch;
const realConsole = { warn: console.warn, error: console.error };

let posted;

function jsonResponse(body, ok = true, status = 200, headers = {}) {
  return { ok, status, json: async () => body, headers: { get: (k) => headers[k.toLowerCase()] ?? null } };
}

// Each submitted task id maps to the outcome YouCam reports when polled.
function mockYouCam(outcomeForCandidate) {
  posted = [];
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === "POST") {
      const { src_file_url } = JSON.parse(init.body);
      posted.push(src_file_url);
      return jsonResponse({ data: { task_id: `task-${posted.length}` } });
    }
    const index = Number(String(url).split("task-")[1]) - 1;
    return jsonResponse({ data: outcomeForCandidate(index) });
  };
}

beforeEach(() => {
  console.warn = () => {};
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.warn = realConsole.warn;
  console.error = realConsole.error;
});

// Regression: an `error_download_image` on the first (cropped) candidate used to
// abort immediately instead of trying the remaining candidate URLs.
test("simulateSkin falls back to the next candidate on error_download_image", async () => {
  mockYouCam((i) =>
    i === 0
      ? { task_status: "error", error_code: "error_download_image" }
      : { task_status: "success", results: { url: "https://yce-us.s3.amazonaws.com/out.jpg" } }
  );

  const result = await simulateSkin(SOURCE, { radiance: 0.2 });

  assert.equal(posted.length, 2);
  assert.match(posted[0], /c_thumb,g_face,z_1\.05/);
  assert.match(posted[1], /c_thumb,g_face,z_0\.9/);
  assert.equal(result.results.url, "https://yce-us.s3.amazonaws.com/out.jpg");
});

test("simulateSkin tries every candidate, ending with the original, before failing", async () => {
  mockYouCam(() => ({ task_status: "error", error_code: "error_download_image" }));

  await assert.rejects(simulateSkin(SOURCE, { radiance: 0.2 }), /Something went wrong/);
  assert.equal(posted.length, 3);
  assert.equal(posted[2], SOURCE);
});

test("simulateSkin does not retry non-retryable errors", async () => {
  mockYouCam(() => ({ task_status: "error", error_code: "error_insufficient_credit" }));

  await assert.rejects(simulateSkin(SOURCE, { radiance: 0.2 }), /Something went wrong/);
  assert.equal(posted.length, 1);
});

test("simulateSkin never sends a crop-before-signature URL for a signed source", async () => {
  mockYouCam(() => ({ task_status: "success", results: { url: "https://yce-us.s3.amazonaws.com/out.jpg" } }));

  await simulateSkin("https://res.cloudinary.com/demo-cloud/image/upload/s--AbCd12_---/abc123", {});

  assert.equal(posted.length, 1);
  assert.doesNotMatch(posted[0], /s--/);
  // simulateSkin's candidates use SIM_CROP_OPTIONS (auto:best, no sharpen),
  // not applyFaceCropToCloudinary's own defaults — so both sides of a
  // What-If before/after slider share identical crop/quality settings.
  assert.equal(posted[0], "https://res.cloudinary.com/demo-cloud/image/upload/c_thumb,g_face,z_1.05,w_1200,h_1200,q_auto:best/abc123");
});

test("a 429 on the status check backs off and retries instead of failing", async () => {
  let polls = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === "POST") return jsonResponse({ data: { task_id: "task-1" } });
    polls++;
    if (polls <= 2) return jsonResponse({}, false, 429);
    return jsonResponse({ data: { task_status: "success", output: [] } });
  };

  const result = await analyzeSkin(SOURCE);
  assert.equal(result.task_status, "success");
  assert.equal(polls, 3);
});

test("a persistent 429 fails as rate limited after the retry cap", async () => {
  let posts = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === "POST") posts++;
    return jsonResponse({}, false, 429);
  };

  await assert.rejects(analyzeSkin(SOURCE), (err) => err.isRateLimited === true);
  assert.equal(posts, youcamTiming.maxRateLimitRetries + 1);
});

test("a Retry-After longer than the remaining budget stops waiting at once", async () => {
  globalThis.fetch = async () => jsonResponse({}, false, 429, { "retry-after": "20" });

  const started = Date.now();
  await assert.rejects(analyzeSkin(SOURCE, { deadline: Date.now() + 2000 }), (err) => err.isRateLimited === true);
  assert.ok(Date.now() - started < 1000);
});

test("a task that never finishes times out at the deadline", async () => {
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === "POST") return jsonResponse({ data: { task_id: "task-1" } });
    return jsonResponse({ data: { task_status: "running" } });
  };

  const started = Date.now();
  await assert.rejects(analyzeSkin(SOURCE, { deadline: Date.now() + 300 }), (err) => err.isTimeout === true);
  assert.ok(Date.now() - started < 1500);
});

test("no new crop candidate starts once too little budget is left", async () => {
  mockYouCam(() => ({ task_status: "error", error_code: "error_src_face_not_found" }));

  await assert.rejects(analyzeSkin(SOURCE, { deadline: Date.now() + youcamTiming.minCandidateMs - 1000 }));
  assert.equal(posted.length, 1);
});
