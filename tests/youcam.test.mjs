import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const { simulateSkin } = await import("../app/lib/youcam.js");

const SOURCE = "https://res.cloudinary.com/demo-cloud/image/upload/v1/abc123.jpg";
const realFetch = globalThis.fetch;
const realConsole = { warn: console.warn, error: console.error };

let posted;

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
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
  assert.equal(posted[0], "https://res.cloudinary.com/demo-cloud/image/upload/c_thumb,g_face,z_1.05,w_1200,h_1200,q_auto:good,e_sharpen:50/abc123");
});
