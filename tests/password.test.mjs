import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword, needsRehash } from "../lib/utils/password.js";

test("new hashes are argon2 and verify", async () => {
  const hash = await hashPassword("correct horse");
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword("correct horse", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
  assert.equal(needsRehash(hash), false);
});

test("old bcrypt hashes still verify and ask for a rehash", async () => {
  const old = await bcrypt.hash("legacy pass", 4);
  assert.equal(await verifyPassword("legacy pass", old), true);
  assert.equal(await verifyPassword("nope", old), false);
  assert.equal(needsRehash(old), true);
});

test("a missing hash never verifies", async () => {
  assert.equal(await verifyPassword("x", null), false);
});
