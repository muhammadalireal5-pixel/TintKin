import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// cloudinary-sign reads these at module load.
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo-cloud";
process.env.CLOUDINARY_API_SECRET = "test-secret";

const {
  getCloudinaryPublicId,
  applyFaceCropToCloudinary,
  getCloudinaryTransformations,
  stripCloudinarySignature,
  validateTrustedImageUrl,
} = await import("../lib/utils/cloudinary.js");
const { signCloudinaryUrl } = await import("../lib/utils/cloudinary-sign.js");

const BASE = "https://res.cloudinary.com/demo-cloud/image/upload";
const CROP = "c_thumb,g_face,z_1.05,w_1200,h_1200";

function expectedSig(toSign) {
  return crypto.createHash("sha1").update(toSign + "test-secret").digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").substring(0, 8);
}

test("getCloudinaryPublicId handles plain, versioned, cropped and signed URLs", () => {
  assert.equal(getCloudinaryPublicId(`${BASE}/abc123.jpg`), "abc123");
  assert.equal(getCloudinaryPublicId(`${BASE}/v1712345/folder/abc123.jpg`), "folder/abc123");
  assert.equal(getCloudinaryPublicId(`${BASE}/${CROP}/v1712345/abc123.jpg`), "abc123");
  assert.equal(getCloudinaryPublicId(`${BASE}/s--AbCd12_---/abc123`), "abc123");
  // Legacy broken shape: crop inserted in front of the signature.
  assert.equal(getCloudinaryPublicId(`${BASE}/${CROP}/s--AbCd12_---/abc123`), "abc123");
  assert.equal(getCloudinaryPublicId("https://example.com/x.jpg"), null);
});

test("applyFaceCropToCloudinary is unchanged for unsigned URLs", () => {
  assert.equal(
    applyFaceCropToCloudinary(`${BASE}/v1712345/abc123.jpg`),
    `${BASE}/${CROP}/v1712345/abc123.jpg`
  );
  assert.equal(applyFaceCropToCloudinary("https://example.com/x.jpg"), "https://example.com/x.jpg");
});

// Regression: What-If failed with YouCam `error_download_image` because the
// crop was applied to a signed URL, producing ".../upload/<crop>/s--SIG--/<id>".
test("applyFaceCropToCloudinary never produces a crop-before-signature URL", () => {
  const signed = signCloudinaryUrl(`${BASE}/v1712345/abc123.jpg`);
  assert.match(signed, /\/upload\/s--[A-Za-z0-9_-]{8}--\/abc123$/);

  const cropped = applyFaceCropToCloudinary(signed, 1.05);
  assert.equal(cropped, `${BASE}/${CROP}/abc123`);
  assert.doesNotMatch(cropped, /s--/);
});

test("signCloudinaryUrl signs `<transformations>/<publicId>` with the API secret", () => {
  const plain = signCloudinaryUrl(`${BASE}/v1712345/abc123.jpg`);
  assert.equal(plain, `${BASE}/s--${expectedSig("abc123")}--/abc123`);

  const cropped = signCloudinaryUrl(`${BASE}/${CROP}/v1712345/abc123.jpg`);
  assert.equal(cropped, `${BASE}/s--${expectedSig(`${CROP}/abc123`)}--/${CROP}/abc123`);
});

test("signCloudinaryUrl repairs legacy crop-before-signature URLs and is idempotent", () => {
  const legacy = `${BASE}/${CROP}/s--AbCd12_---/abc123`;
  const repaired = signCloudinaryUrl(legacy);
  assert.equal(repaired, `${BASE}/s--${expectedSig(`${CROP}/abc123`)}--/${CROP}/abc123`);
  assert.equal(signCloudinaryUrl(repaired), repaired);
});

test("helpers ignore non-Cloudinary and empty input", () => {
  assert.equal(signCloudinaryUrl("https://example.com/x.jpg"), "https://example.com/x.jpg");
  assert.equal(signCloudinaryUrl(null), null);
  assert.equal(getCloudinaryTransformations(`${BASE}/abc.jpg`), "");
  assert.equal(stripCloudinarySignature(`${BASE}/s--AbCd12_---/abc`), `${BASE}/abc`);
});

test("validateTrustedImageUrl only accepts https on allow-listed hosts", () => {
  assert.equal(validateTrustedImageUrl(`${BASE}/abc.jpg`), true);
  assert.equal(validateTrustedImageUrl("http://res.cloudinary.com/demo-cloud/image/upload/abc.jpg"), false);
  assert.equal(validateTrustedImageUrl("https://res.cloudinary.com.evil.com/abc.jpg"), false);
  assert.equal(validateTrustedImageUrl("https://eviltintkin.com/abc.jpg"), false);
  assert.equal(validateTrustedImageUrl("not a url"), false);
});
