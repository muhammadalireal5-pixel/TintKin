# TintKin Security & Reliability Audit

**Date:** 2026-10-02 · **Scope:** whole repository at `b16a094` plus uncommitted working tree · **Stack:** Next.js 16.2.12 (App Router, Turbopack), React 19.2, Auth.js `next-auth@5.0.0-beta.25` (JWT sessions), Mongoose 8, Cloudinary, YouCam, Qwen (DashScope), Resend, Sentry, Vercel.

## How this audit was done

- Every server action file (`"use server"`), route handler, `auth.js`, `proxy.js`, all Mongoose models, all external integration code, config, and the reset / admin / account-deletion flows were read in full by three parallel reviewers (auth & authorization; integrations, uploads & privacy; logic, data & config).
- Their findings were then spot-checked against the source before anything was changed.
- "Confirmed" means the code path was traced; "suspected" means it needs runtime verification.
- **No production services were touched.** No database migrations or deletions were run, no credentials were rotated, and no Cloudinary, Vercel or Google settings were changed.

### Verification levels used in the Status column

| Status | Meaning |
|---|---|
| **Fixed – tested** | Fixed, and covered by a unit/regression test that passes (and, where noted, was shown to fail on the old code). |
| **Fixed – built** | Fixed; the production build and lint pass; reviewed by reading the code. Not exercised against live services. |
| **Open** | Not fixed. The reason and the required action are given. |

## Baseline vs. after

| Check | Baseline (before changes) | After |
|---|---|---|
| Tests | None existed | `bun run test`: **17 / 17 pass** (0 fail, 0 skipped) |
| Lint (`eslint .`) | 34 problems (20 errors, 14 warnings) | 34 problems (20 errors, 14 warnings). Identical set: every remaining issue is in files that had it before (mostly the React Compiler `set-state-in-effect` rule and `<img>` warnings). No new issues. |
| Type check (`tsc -p jsconfig.json`) | **Fails** with 9 errors (run on HEAD in a temporary worktree): `@types/node` isn't installed, plus a Mongoose model union-type error | Fails with 10 errors. Same causes; the one added error is another `process` reference with no Node types in `lib/utils/cloudinary.js`. |
| Production build (`next build`) | Passes | **Passes**, including the new `/api/session/expired` route |
| Dependency audit | See §6. 3 critical, 2 high | Unchanged (manual action required) |

---

## 1. The reported error: What-If simulation fails (`error_download_image`)

**Severity:** Critical (functional). The core feature failed for every user without a custom photo. **Status:** Fixed – tested.

**Symptom:** the UI showed "Simulation failed. Please try again later." The terminal showed `simulateSkin failed (skin-simulation task): Error: error_download_image`, which was only visible after adding logging; it had previously been swallowed silently.

**Root cause (confirmed):** a display-only signed URL was reused as the input for a transformation.

1. `getLatestData()` (`app/lib/actions.js`) replaces `latestSelfie.imageUrl` with a **signed** delivery URL: `…/image/upload/s--SIG--/<publicId>` (`signCloudinaryUrl`, `lib/utils/cloudinary-sign.js:46`).
2. `runWhatIfSim()` gets its source image from `getLatestData()`, so it receives that signed URL.
3. `simulateSkin()` (`app/lib/youcam.js:254`) crops it with `applyFaceCropToCloudinary` (`lib/utils/cloudinary.js:116`). That function split the URL on `/upload/` and inserted the crop **in front of the signature**: `…/upload/c_thumb,g_face,…/s--SIG--/<id>`. Cloudinary treats `s--SIG--` as part of the public ID, so the URL doesn't resolve and YouCam reports `error_download_image`.
4. `simulateSkin` only retried face-size/bounds errors. The download error therefore aborted on the first candidate URL, and the fallback URLs (another crop and the original) were never tried.
5. Its catch block also replaced the real error with a generic string and logged nothing.

Scans worked because the capture page passes the fresh, **unsigned** upload URL straight to `analyzeSkin`.

**Related damage from the same pattern (confirmed):**
- The "Without Routine" baseline image of every simulation was stored with the same broken URL.
- `signCloudinaryUrl` returned already-signed URLs unchanged, and dropped existing transformations when it re-signed. Saved simulations therefore showed a broken or uncropped baseline next to a cropped simulated image.
- `getCloudinaryPublicId` didn't strip `s--…--`, so deleting an image by its signed URL silently did nothing.

**Fix:**
- `applyFaceCropToCloudinary` removes the signature before adding a transformation. Selfies are public `upload` assets, so the unsigned crop can be delivered; this matches what `analyzeSkin` already relies on.
- `getCloudinaryPublicId` skips signature segments.
- `signCloudinaryUrl` always re-signs, keeping the URL's own transformations inside the signature. This also **repairs** legacy records stored in the broken shape at read time, with no data migration needed.
- `simulateSkin` and `analyzeSkin` treat download failures as retryable and fall back to the next candidate URL.
- Failures are logged with the YouCam error code only, never the raw response body (which can contain image URLs).
- `runWhatIfSim` logs its failure message to the server terminal.

**Verification:**
- `tests/cloudinary.test.mjs` and `tests/youcam.test.mjs` (11 tests) cover: crop-of-signed-URL, re-signing with crop, legacy URL repair, idempotence, and fallback on `error_download_image` with a mocked YouCam.
- Running the old `applyFaceCropToCloudinary` from HEAD against a signed URL reproduces exactly `…/upload/c_thumb,…/s--AbCd12_---/abc123`, so the regression test would fail on the old code.
- **Not yet verified end-to-end against live YouCam/Cloudinary.** See manual action M1.

---

## 2. Findings

### Critical

| # | Finding | Location | Root cause | Impact | Fix | Status |
|---|---|---|---|---|---|---|
| C1 | What-If simulation broken | see §1 | see §1 | Core feature unavailable | see §1 | Fixed – tested |
| C2 | **Vulnerable framework/auth versions** | `package.json` (`next@16.2.12`, `next-auth@5.0.0-beta.25`, pinned exactly) | Outdated pins | `npm audit` lists critical advisories: Next.js unauthenticated RCE on **Windows-hosted** servers (this dev machine runs Next on Windows); Auth.js email-normalisation homoglyph bypass and email-misdelivery issues; high-severity PostCSS and sharp/libvips advisories via `next`. Production on Vercel (Linux) is less exposed to the Windows RCE, but the Auth.js issues apply everywhere. | Upgrade to `next@16.3.8` and `next-auth@5.0.0-beta.32` (both non-major). | **Open.** Bun isn't available in this environment, so `bun.lock` can't be regenerated. Editing `package.json` alone would break `bun install --frozen-lockfile` deploys. **Manual action M2.** |

### High

| # | Finding | Location | Root cause | Impact | Fix | Status |
|---|---|---|---|---|---|---|
| H1 | **Account pre-hijacking via Google linking** | `auth.js:112` (`signIn` callback) | Sign-up never verifies email ownership. The Google callback merged any account with the same email and didn't check `profile.email_verified`. | An attacker registers victim@gmail.com with their own password. When the victim later signs in with Google, the attacker's password and sessions keep access to the victim's selfies and data. | Require `email_verified === true`. When Google is first linked to an account that has a password, remove that password and bump `sessionVersion` (revoking every existing session). Refuse a Google account if the record is already bound to a *different* Google ID. **Trade-off:** a legitimate user who registered with a password and later uses Google loses password login and can set a new one via "forgot password". | Fixed – built |
| H2 | **Sessions never revocable; deleted accounts resurrected** | `app/lib/auth-server.js:33`, `getDbUser` (`app/lib/actions.js:231`), `completeOnboarding` (`:994`), `app/onboarding/layout.jsx` | Stateless 14-day JWTs with no version check. `getDbUser` re-created any missing user from the token, and `findSessionUser` fell back to matching by email. | Password reset and account deletion didn't log anyone out. A deleted account's old cookie silently recreated it. An old token could attach to a *new* account registered with the same email. | Added `User.sessionVersion`. It's copied into the JWT (`token.sv`), and the user lookup returns null when they differ. No auto-create. The email fallback now applies only to legacy non-ObjectId ids. Password reset increments `sessionVersion`. A revoked or orphaned session goes to `/api/session/expired`, which clears the cookie and redirects to sign-in. A plain redirect to `/sign-in` would loop, because `proxy.js` sends any cookie holder to `/dashboard`. The route leaves *valid* sessions alone, so it can't be used to force a logout. Existing tokens and users (no `sv` field) both resolve to 0, so nobody is logged out on deploy. | Fixed – built |
| H3 | **Password reset completely broken** | `app/reset-password/exchange/page.jsx`, `actions.js:16` | (a) In Next 15+ `searchParams` is a Promise, so the token was always undefined. (b) Even with the token, the code called `cookies().set()` during Server Component render, which throws, *after* it had already cleared the token. (c) The token was consumed on a GET, so email link scanners could burn it. | No user could reset a password. | The page awaits `searchParams` and renders a "Continue" form. A POSTed Server Action consumes the token atomically (`findOneAndUpdate` + `$unset`), sets the 5-minute `reset-session` cookie, and redirects to the existing form. The cookie contract is unchanged. | Fixed – built |
| H4 | **Quota bypass by switching timezone** | `app/lib/quota.js:26`, `lib/utils/date.js` | Day/month keys came from an unvalidated client timezone, and a key that didn't match the stored one counted as zero. | Alternating e.g. `Pacific/Kiritimati` and `Etc/GMT+12` reset the daily counter on every scan. That meant unlimited paid YouCam/Qwen calls, and an unlimited monthly quota for any tier around month boundaries. | `resolvePeriod` (`lib/utils/quota-period.js`): a key *older* than the stored one counts against the stored period, so counters can't move backwards. Invalid timezones become UTC (`normalizeTimezone`) at every action that accepts one. Release now uses the keys actually written. The best remaining bypass is one extra scan per day by jumping to the furthest-ahead zone. | Fixed – tested |
| H5 | **Users could analyze, store or delete other users' images** | `analyzeAndSaveSelfie` (`app/lib/actions.js:269`), `runWhatIfSim` (`:748`), `lib/utils/cloudinary.js` | `validateTrustedImageUrl` accepted *any* `res.cloudinary.com` URL (any customer's cloud, including `/image/fetch/<any-url>`). Failure cleanup and the "delete immediately" privacy path then destroyed that public ID in **our** cloud. | Any user knowing an image URL could get another user's photo analyzed or stored as theirs, or deleted. | Uploads now get an explicit `public_id` of `users/<uid>/<random>`. This works under both fixed- and dynamic-folder Cloudinary modes, which a `folder` parameter wouldn't. `isOwnedUserUpload` accepts client-supplied URLs only from our cloud name, in the `/image/upload/` path, under the caller's own prefix. Stored (server-side) URLs are unaffected. **Trade-off:** a photo uploaded before deploy but analyzed after it is rejected once and must be re-uploaded. | Fixed – tested (helper); built (actions) |

### Medium

| # | Finding | Location | Fix / note | Status |
|---|---|---|---|---|
| M1 | Open redirect after sign-in: `?redirect=/%09/evil.com` passed the check, and the browser normalises it to `//evil.com` | `app/sign-in/page.jsx` | `getSafeRedirect` (`lib/utils/redirect.js`) rejects control characters and backslashes, and requires the URL to parse as same-origin | Fixed – tested |
| M2 | Admin OTP attempt limit could be bypassed with parallel requests (read, increment, save) | `app/lib/admin-auth.js:108` | The attempt is counted atomically (`findOneAndUpdate` with `attempts < 5`) *before* comparing; the code is redeemed with a conditional single-use update | Fixed – built |
| M3 | Country leaderboard returned every country (the second `$or` overwrote the country `$or`) | `getLeaderboard` (`app/lib/actions.js:1752`) | `$and: [userFilter, {$or: …}]` | Fixed – built |
| M4 | A failed quota check silently spent the user's purchased extra scans/simulations | `analyzeAndSaveSelfie`, `runWhatIfSim` | Only `daily_limit`/`monthly_limit` fall through to extras. A transaction error or missing user returns a retryable error instead. | Fixed – built |
| M5 | Rate limiter never reset for steady traffic: each hit moved `windowStart` to "now", so a user scanning every 50s was eventually locked out | `app/lib/rate-limit.js:26` | Fixed windows (`floor(now/window)`), with `expiresAt` set on insert. Concurrent first hits can still create duplicate window documents (slight undercount); a unique index would need a migration of the existing non-unique index. | Fixed – built |
| M6 | `updateSimulationPrivacy` returned a live Mongoose document from a server action. The call rejected on the client after the write, leaving an endless spinner. | `app/lib/actions.js:938` | Returns plain JSON with the `id` the client expects | Fixed – built |
| M7 | No timeouts on YouCam, Cloudinary, geocoding or export fetches. Qwen SDK defaults were a 10-minute timeout with 2 retries. Non-JSON error pages caused opaque `SyntaxError`s. | `app/lib/youcam.js`, `qwen.js:8`, `actions.js`, `export-data.js`, `delete-account.js` | `AbortSignal.timeout` on every outbound fetch (YouCam 15s per request, Cloudinary 20s); Qwen `timeout: 45s, maxRetries: 1`; `readJson` converts non-JSON bodies into YouCam errors | Fixed – built |
| M8 | YouCam result ZIP downloaded and fully inflated with no size limit (zip-bomb / memory exhaustion) | `extractScoreInfo` (`app/lib/youcam.js:107`) | HTTPS only, 5 MB download cap, and only `score_info.json` (≤1 MB) is inflated. No host allow-list, because YouCam's result host isn't documented and guessing wrong would break scans. | Fixed – built |
| M9 | Account deletion left `Report` and `RateLimit` documents, and CDN-cached image copies | `app/lib/delete-account.js:47` | Also deletes `Report` and `RateLimit` (`identifier = userId`); Cloudinary destroy sends `invalidate=true`. The destroy result is still not retried on failure (see Open). | Fixed – built |
| M10 | Simulation inputs stored unvalidated: arbitrary objects and labels, near the 16 MB BSON limit; a client-supplied `customMultiplier` fed the projection maths unbounded | `runWhatIfSim` | `sanitizeInterventions` keeps known fields (≤10 items, bounded strings) and clamps `customMultiplier` to 0.65–0.95, the range the Qwen prompt specifies. Labels are capped at 200 characters. Results for valid inputs are unchanged. | Fixed – built |
| M11 | YouCam result images re-uploaded via the unsigned `ml_default` preset (works only if an unsigned preset exists, which anyone can use) | `uploadUrlToCloudinary` (`actions.js:91`) | Server-signed upload under the user's prefix. On failure it still falls back to the provider URL so the simulation keeps working, now with a warning log (see Open). | Fixed – built |
| M12 | No security headers; dev LAN IPs trusted for server actions in production | `next.config.mjs:52` | Added `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera/geolocation self), and HSTS in production. `serverActions.allowedOrigins` applies in dev only. **No CSP** (see Open). | Fixed – built |
| M13 | Server-action / RSC / route errors never reached Sentry | `instrumentation.js` | `export const onRequestError = Sentry.captureRequestError` | Fixed – built |
| M14 | Usage display counts documents, while enforcement counts `scanUsage`/`simUsage` counters (deleting a sim lowers the shown count but not the enforced one) | `getUsageQuotas` (`actions.js:1051`) | Read the enforcement counters | **Open** (behaviour change to the UI numbers; needs a product decision) |
| M15 | Scan flow write ordering: the user's streak/badges are written with a whole-array `$set` *before* `Selfie.create`, and the previous image is deleted first. A failure mid-way leaves inconsistent state; concurrent `$addToSet` badges can be lost. | `analyzeAndSaveSelfie` | Create the Selfie first, then `$addToSet` badges and `$set` streak, and delete the old image last | **Open** (the largest function in the codebase; needs integration tests against a real database first) |
| M16 | Streak logic: a DST 25-hour gap resets streaks; every-other-day Standard users can never exceed 1; displayed streaks never decay | `analyzeAndSaveSelfie` | Compare local day keys, allow a 2-day gap for every-other-day plans, derive the displayed streak from `lastUploadDate` | **Open** (scoring/gamification logic is a compatibility constraint; needs product sign-off) |
| M17 | Routine "today" is UTC for everyone (the dashboard passes `"UTC"`; the checklist passes nothing), so AU users' routine resets mid-morning | `app/dashboard/page.jsx`, `RoutineChecklist.jsx` | Store a validated per-user timezone server-side and use it | **Open** |
| M18 | `saveRoutineCompletion`: non-atomic find-or-create (duplicate day logs), unvalidated `step` strings (unbounded arrays), and `routine_master` unlocks after one AM plus one PM step | `actions.js:1425` | Atomic upsert with `$addToSet`/`$pull`, whitelist steps against the user's routine | **Open** |
| M19 | Unbounded queries: `getLatestData()` without a limit loads every selfie and lifestyle document (used by What-If, Share, Reports and inside `runWhatIfSim`); also `getWeeklyHistory`, `getSavedSimulations` and `getPercentileRank` | `actions.js` | Projections and limits, or aggregation | **Open** (performance; safe once tests exist) |
| M20 | Leaderboard ranking is wrong past 200 users (`.limit(200)` before sorting by score) | `getLeaderboard` | Aggregate the latest score per user, then sort, then limit | **Open** |
| M21 | No email verification for credentials sign-up (root cause behind H1) | `app/lib/auth-actions.js:22` | Verification email before activation | **Open** (new feature; H1 closes the exploit path) |
| M22 | Selfies are public `type=upload` assets. "Signed" display URLs don't make them private: the unsigned URL works for anyone who has it. | Cloudinary upload | Upload as `type=authenticated` and always sign | **Open** (changes delivery of every existing image; needs a migration plan) |

### Low

| # | Finding | Status |
|---|---|---|
| L1 | Login timing revealed which emails have accounts (no bcrypt for unknown emails). Fixed: a dummy bcrypt compare runs (`auth.js:67`). | Fixed – built |
| L2 | Sign-up had no type/length checks, and the defined `REGISTER` rate limit was never used. Fixed: type checks, email format, 72-byte bcrypt cap, display name ≤50, IP rate limit 3/hour. | Fixed – built |
| L3 | Invalid timezones threw `RangeError` (500s, or a deleted upload). Fixed via `normalizeTimezone`. | Fixed – tested |
| L4 | Reverse-geocode request interpolated unencoded `lat`/`lng`. Fixed (encoded, with a timeout). No range validation yet. | Fixed – built (partial) |
| L5 | Login rate-limit key trusts the first `X-Forwarded-For` value (Vercel overwrites it; self-hosting may not); the progressive-lockout branch is unreachable | Open |
| L6 | Admin logout only deletes the cookie (a stolen admin token stays valid for 24h) | Open |
| L7 | Billing webhook uses a static shared bearer secret (compared timing-safely) rather than the provider's HMAC over the body; no replay or event-ID protection | Open (depends on which billing provider is chosen) |
| L8 | Report maths: null scores averaged as 0, `filter(Boolean)` drops genuine 0 scores, "past N days" uses the scan count | Open (scoring logic) |
| L9 | `youth_catalyst` evaluated against the oldest selfie; `realAge` = year − year (can be off by one) | Open (scoring logic) |
| L10 | `maskUrls` and `youCamTaskId` are written but missing from the strict `Selfie` schema, so they're silently dropped | Open |
| L11 | `adminAddExtraScans`: string `amount` concatenates (`3 + "5"` gives `"35"`); read-modify-write isn't atomic (admin-only) | Open |
| L12 | Sentry has `beforeSend` scrubbing but no `beforeSendTransaction`; sampled traces may carry image URLs | Open |
| L13 | Data export omits `Report` documents and simulation images, and builds the ZIP in memory as base64 in the action response | Open |
| L14 | `vercel.json` sets no `maxDuration`. If the long scan/simulation flow is killed by a platform timeout, the catch block never runs (quota slot not released, image orphaned). | Open (suspected; needs to be checked against the Vercel plan limits) |
| L15 | `uploadUrlToCloudinary` still falls back to storing the YouCam S3 URL on failure, and that URL may expire | Open (kept deliberately so simulations don't fail) |
| L16 | Account deletion doesn't check or retry the Cloudinary destroy result | Open |

**Re-assessed, not an issue:** "What-If custom photos are never deleted." Those photos become the simulation's scenario images. They are removed by "Delete Results", by declining "keep photo", by `deleteSavedSimulation` and by account deletion, all of which delete the same public ID. An unconfirmed simulation stays in the user's history, where it can be deleted.

**Verified correct (no change needed):**
- Every server action takes the user ID from the server session, never from client arguments.
- `updateUserSettings` uses an allow-list.
- Users can't self-upgrade their tier when `ENABLE_DEMO_TIER_SWITCHING` is off.
- Admin API routes and the admin page verify the HMAC admin session.
- The session object exposes only `id` (now also `sv`).
- `passwordHash` and the reset fields are `select: false`.
- Reset tokens are 32 random bytes stored as SHA-256 hashes, expiring after 1 hour.
- The webhook secret comparison is timing-safe.
- Export is scoped to the caller and excludes password fields.
- Quota reservation is transactional.
- The Mongo connection is cached for serverless.
- No secrets are committed: `.env.example` is the only env file ever tracked; history and diff scans found no keys; `.env*` is git-ignored.

---

## 3. Files changed in this pass (security/reliability)

- **Reported error:** `lib/utils/cloudinary.js`, `lib/utils/cloudinary-sign.js`, `app/lib/youcam.js`, `app/lib/actions.js` (`runWhatIfSim` logging).
- **Auth/session:** `auth.js`, `app/lib/auth-server.js`, `app/lib/mongoose.js` (`sessionVersion` field, default 0, no migration needed), `app/api/session/expired/route.js` (new), `app/onboarding/layout.jsx`, `app/reset-password/exchange/{page.jsx,actions.js}`, `app/reset-password/form/actions.js`, `app/sign-in/page.jsx`, `lib/utils/redirect.js` (new), `app/lib/auth-actions.js`, `app/lib/admin-auth.js`.
- **Data/quota/integrations:** `app/lib/actions.js`, `app/lib/quota.js`, `lib/utils/quota-period.js` (new), `lib/utils/date.js`, `app/lib/rate-limit.js`, `app/lib/qwen.js`, `app/lib/delete-account.js`, `app/lib/export-data.js`.
- **Config/docs/tests:** `next.config.mjs`, `instrumentation.js`, `package.json` (`test` script), `.env.example`, `README.md`, `.gitignore` (`!AUDIT.md`), `tests/**`.

The working tree also contains the separate, earlier **UI/UX pass** from this session: mobile bottom nav, page/modal animations, dashboard restructure, loaders, and the `framer-motion` dependency (added with npm because Bun was unavailable; **`bun.lock` does not yet include it**, see M2). Those UI files aren't part of this audit's security scope.

## 4. Tests added

`bun run test` (equivalently `node --import ./tests/setup/register.mjs --test "tests/**/*.test.mjs"`):

- `tests/cloudinary.test.mjs`:
  - public-ID parsing (plain, versioned, cropped, signed, legacy broken shape)
  - crop behaviour unchanged for unsigned URLs
  - **regression:** crop of a signed URL
  - signature correctness against an independent SHA-1
  - legacy URL repair and idempotence
  - trusted-URL validation
- `tests/youcam.test.mjs` (mocked `fetch`):
  - **regression:** falls back on `error_download_image`
  - tries all candidates ending with the original
  - doesn't retry non-retryable errors
  - never sends a crop-before-signature URL
- `tests/security-utils.test.mjs`:
  - open-redirect payloads
  - **regression:** a timezone switch can't reset a quota period (with real `Pacific/Kiritimati` / `Etc/GMT+12` day keys)
  - timezone normalisation
  - upload-ownership checks (other user, other cloud, `/fetch/` proxy, legacy unprefixed, foreign host)

**Not covered by automated tests (honest gap):**
- Anything that needs MongoDB or a NextAuth runtime: server actions end-to-end, session revocation, the reset flow, OTP atomicity, leaderboard query, rate-limit window, account deletion.
- Frontend and responsive layouts.

Adding `mongodb-memory-server` plus an Auth.js test harness, and Playwright for E2E, is the recommended next step. It was not done here, to avoid new dependencies that `bun.lock` can't record from this environment.

## 5. Production-readiness checklist

| Item | State |
|---|---|
| No committed secrets or exposed credentials | ✅ Verified (history + diff scan; `.env*` ignored) |
| Environment configuration documented and validated | ⚠️ Documented (`.env.example`, README). No startup validation of required variables. |
| Auth and authorization enforced server-side | ✅ Verified by review; session revocation added. ⚠️ Revocation and reset flows are not runtime-tested. |
| User records and sensitive images isolated | ⚠️ Cross-user image access fixed (H5); images are still public delivery assets (M22) |
| Input validation and upload restrictions | ⚠️ Improved (uploads, simulations, sign-up, timezones); routine steps, location ranges and product data URLs are still loose |
| API integrations handle timeouts and failures | ✅ Timeouts and parse handling added. ⚠️ No overall deadline / `maxDuration` (L14). |
| Security headers, CORS, rate limiting | ⚠️ Headers added (no CSP); rate limiter fixed; login IP trust (L5) |
| Consistent errors without sensitive info | ✅ Generic client messages; server logs use error codes/messages, not raw bodies |
| Logging avoids secrets and PII | ⚠️ New logs are scrubbed; `auth-actions.js` still logs an email on reset; Sentry transactions not scrubbed (L12) |
| DB queries, indexes, connection management | ⚠️ Indexes exist on hot paths; unbounded queries remain (M19) |
| Dependency audit assessed | ❌ **Critical advisories open (C2), manual upgrade required** |
| Production build succeeds | ✅ `next build` passes |
| Critical flows have regression coverage | ⚠️ Unit/regression only for the fixed bugs; no integration/E2E |
| Health checks / graceful failure | ❌ No health endpoint |
| README accurate setup/test/deploy | ✅ Added |
| No unintended UI/feature/data/logic changes | ⚠️ Intentional, documented behaviour changes: the reset page now has a "Continue" button; Google linking removes a pre-existing password (H1); pre-deploy uploads must be re-uploaded once (H5). Scoring and simulation maths are unchanged except clamping out-of-range client multipliers (M10). |

**This codebase is not production-ready yet.** C2 must be resolved, and the manual checks below performed, before calling it that.

## 6. Required manual actions

| # | Action | Why |
|---|---|---|
| M1 | **Re-run a What-If simulation** ("1 product vs none") with a signed-in account and confirm it completes. Also check that an older saved simulation now shows its baseline image. | Confirms the fix for C1 against live Cloudinary/YouCam |
| M2 | On a machine with Bun: `bun add next@16.3.8 next-auth@5.0.0-beta.32` (and `bun install` to record `framer-motion` in `bun.lock`), then rebuild and smoke-test sign-in with both providers | C2 (critical advisories); keeps the lockfile authoritative |
| M3 | Test password reset end-to-end (request → email → **Continue** → new password → old sessions signed out) | H2/H3 are build-verified only |
| M4 | In Cloudinary, delete any **unsigned** upload preset (e.g. `ml_default`) if nothing else uses it | The app no longer needs one; unsigned presets let anyone upload to your account |
| M5 | Decide on M14–M18, M22 and the Open Low items, which change scoring, UX or storage | Product decisions, out of scope for a behaviour-preserving pass |
| M6 | Install `@types/node` (dev) to make `bun run type-check` meaningful | Type check currently fails on the environment, not the code |
