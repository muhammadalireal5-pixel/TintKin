import { test } from "node:test";
import assert from "node:assert/strict";

const { getClientIp } = await import("../app/lib/request-ip.js");

function headersFrom(obj) {
  const map = new Map(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name) => map.get(name.toLowerCase()) ?? null };
}

// Regression: a client can set X-Forwarded-For itself — each hop *appends*
// its own observed address, it doesn't overwrite earlier entries — so the
// *first* entry is attacker-controlled. Trusting it (the old behavior) let
// anyone collide with a victim's rate-limit key by spoofing the victim's IP,
// or dodge an IP-only cap by sending a fresh fake value every request.
test("getClientIp trusts the last X-Forwarded-For hop, not the client-supplied first one", () => {
  const headers = headersFrom({ "x-forwarded-for": "9.9.9.9, 203.0.113.5" });
  assert.equal(getClientIp(headers), "203.0.113.5");
});

test("getClientIp handles a single-hop X-Forwarded-For", () => {
  const headers = headersFrom({ "x-forwarded-for": "198.51.100.23" });
  assert.equal(getClientIp(headers), "198.51.100.23");
});

test("getClientIp falls back to x-real-ip when x-forwarded-for is absent", () => {
  const headers = headersFrom({ "x-real-ip": "198.51.100.7" });
  assert.equal(getClientIp(headers), "198.51.100.7");
});

test("getClientIp returns null, not a shared sentinel, when nothing is present", () => {
  const headers = headersFrom({});
  assert.equal(getClientIp(headers), null);
});
