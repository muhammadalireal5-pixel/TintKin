/**
 * Extracts the request's real IP for rate-limiting.
 *
 * `x-forwarded-for`'s *first* entry is whatever the original caller put
 * there — each hop in a proxy chain appends its own observed address to the
 * end, it doesn't overwrite earlier entries. Trusting the first entry (as
 * every call site used to) means a client can set `X-Forwarded-For: <any
 * IP>` and have that string land directly in the rate-limit key, including
 * a victim's real IP to collide with their key, or a fresh random value on
 * every request to dodge an IP-only cap entirely.
 *
 * The *last* entry is whatever our own edge/reverse proxy actually observed
 * on the hop directly in front of the app, which a client cannot set. This
 * assumes exactly one trusted hop in front of the app (true for a single
 * Vercel deployment, or one reverse proxy self-hosted); see AUDIT.md's
 * client-IP-trust entry if that topology ever changes.
 *
 * Returns `null` when no IP-identifying header is present at all, rather
 * than a shared sentinel string — callers must not fold that into an
 * email-keyed (or otherwise per-identity) rate limit, since a key with no
 * real IP component is attacker-predictable from the identity alone. Use
 * `checkOriginAwareRateLimit` (see rate-limit.js) for that case.
 */
export function getClientIp(headersList) {
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}
