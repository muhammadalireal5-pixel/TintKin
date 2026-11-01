import test from "node:test";
import assert from "node:assert/strict";
import { maskEmail, initialOf, redactText } from "../lib/utils/mask.js";

test("emails keep only their first letters", () => {
  assert.equal(maskEmail("ahmed.raza@gmail.com"), "a•••@g•••.com");
  assert.equal(maskEmail(""), "");
  assert.equal(maskEmail("nope"), "•••");
});

test("names become an initial", () => {
  assert.equal(initialOf("sara"), "S.");
  assert.equal(initialOf(""), "");
});

test("free text loses emails, links and phone numbers", () => {
  const out = redactText("Mail me at a.b@x.io or call +61 412 345 678, see https://x.io/p");
  assert.doesNotMatch(out, /@|412|https/);
});
