# TintKin Security & Reliability Audit

**Date:** 2026-10-02, updated 2026-10-05 · **Scope:** whole repository at `b16a094` plus uncommitted working tree · **Stack:** Next.js 16.3.8 (App Router, Turbopack), React 19.2, Auth.js `next-auth@5.0.0-beta.32` (JWT sessions), Mongoose 8, Cloudinary, YouCam, Qwen (DashScope), Resend, Sentry, Vercel.

## 2026-10-05 follow-up pass

Closed the remaining clear-cut gaps from the checklist below (no product/UX decisions made on the user's behalf — those are still Open, see §7). Bun was available in this session, so the dependency upgrade (C2) and lockfile sync could finally be done.

- **C2 (critical) — fixed.** `next` → `16.3.8`, `next-auth` → `5.0.0-beta.32` via `bun add`; `bun install` also recorded `framer-motion` in `bun.lock` (previously installed with npm only). `bun run test` (23/23), `next build`, and lint (same 34 pre-existing problems, no new ones) all pass on the upgraded versions.
- **M6 — fixed.** `@types/node` installed; `bun run type-check` now actually runs instead of failing outright. It surfaces ~20 pre-existing implicit-`any`/type-narrowing issues across `lib/utils/{date,denoise,pdf,pii-scrubber}.js` and `lib/constants/quotas.js` — none are runtime bugs, all were invisible before because the command failed before reaching them. Left as a follow-up type-safety cleanup, not fixed here.
- **CSP — added.** `proxy.js` now generates a per-request nonce and sets `Content-Security-Policy` (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'unsafe-inline'` — the app has ~70 inline `style={{}}` attributes that a nonce can't cover, `img-src` allowing Cloudinary/S3/data/blob, `frame-ancestors 'none'`, `object-src 'none'`, etc.). `app/layout.js` and `app/pricing/page.jsx` read the nonce via `headers()` and apply it to their inline JSON-LD `<script>` tags. **Trade-off:** both now call `headers()`, which is a dynamic API — every route lost static prerendering (confirmed in the build output: all routes are now `ƒ` except `robots.txt`/`sitemap.xml`/`opengraph-image.jpg`, where before this change pages with no session/auth checks of their own, e.g. `/`, `/privacy`, `/terms`, `/pricing`, were plausibly static). Functionally unaffected, but marketing pages no longer get CDN-level static caching. **Not yet tested against a real browser** — verify no console CSP violations on sign-in (Google OAuth is a full-page redirect so it isn't blocked by any CSP directive, but this hasn't been clicked through live).
- **Health check — added.** `GET /api/health` checks Mongo connectivity (`mongoose.connection.readyState`) and returns `200`/`ok` or `503`/`degraded`. No new env vars.
- **M19 — fixed.** `getLatestData()`'s "no `selfieLimit`" path (used by `runWhatIfSim`, the What-If page's own client fetch, `/share`, `/reports`) loaded every selfie/lifestyle document ever created, unprojected. It's now capped at `MAX_SELFIE_HISTORY = 1000` / `MAX_LIFESTYLE_HISTORY = 400` (newest-first, lean, list-fields-only — generous enough that `predict.js`'s trend math, which already saturates its confidence weighting well under 100 data points, never notices). Scan count and "first scan" values now always come from two cheap exact queries (`totalSelfieCount`, `firstSelfie`) instead of being derived from the array, so achievements/scan-count stay correct even past the cap. Also deleted a dead `signCloudinaryUrl` loop over `allSelfies` that hasn't had an `imageUrl` field to sign since the dashboard path added field projection.
- **M20 — fixed.** `getLeaderboard()` capped candidates to 200 users *before* sorting by score, so a city/country/global scope past 200 users silently dropped genuine top scorers (and could exclude the viewer's own row). The cap is now 5000 and is explicitly a DoS safety valve, applied before the existing sort — ranking, `userCount` and `myRank` are computed from the full candidate set; only the displayed `entries` list is still sliced to 50.
- **L5 (partial) — fixed.** `auth.js`'s progressive-login-delay code had an unreachable `attemptCount >= 7` hard-lockout branch: `RATE_LIMIT_CONFIGS.LOGIN.limit` is 5/hour, so `checkRateLimit` already throws at attempt 6, long before attempt 7's special-cased message could fire. Removed the dead branch and its two unused constants; the reachable progressive delay (attempts 1-5) is untouched. The IP-trust half of L5 (self-hosting vs. Vercel) is unchanged — still Open, it's a deployment-target decision.
- **L6 — fixed.** Admin "Log out" previously only cleared the cookie; a copied token stayed valid for up to 24h. Added a one-document `AdminAuthState` collection (`revokedBefore` timestamp): logout stamps it, and `verifyAdminSession` now rejects any token issued before that stamp. Adds one Mongo read to every admin-authenticated request; acceptable for an admin-only path.
- **L9 (partial) — fixed.** `realAge = currentYear - birthYear` over/understated age by up to a year depending on whether the birthday had passed yet. Replaced with `calculateAge()` (`lib/utils/date.js`), which compares month/day too, used in both places it was duplicated (`analyzeAndSaveSelfie`'s `youth_catalyst` unlock, and `getLatestData`'s displayed `realAge`). The other half of L9 — `achievements.js` evaluates `youth_catalyst` against `firstSelfie ?? allSelfies[0]`, i.e. the user's *oldest* scan, not their latest — is a real-looking bug (a local variable there is literally named `latestSelfie` but bound to the oldest record) but changes who satisfies an achievement condition, so it's left for product sign-off rather than changed silently. Note the actual *unlock* during a scan (`analyzeAndSaveSelfie`, the fix above) already correctly uses that scan's own skinAge; this only affects the recomputed/display path in `getLatestData`.
- **L10 — fixed.** `Selfie.create()` writes `maskUrls` and `youCamTaskId`, but the schema (`strict: true`) didn't declare them, so both were silently dropped on every save. Added both fields to `SelfieSchema`.
- **L11 — fixed.** `adminAddExtraScans`: `amount` is now validated as a finite integer (was string-concatenating, e.g. `3 + "5"` → `"35"`) and applied via `findByIdAndUpdate({ $inc })` instead of a non-atomic read-modify-write `.save()`.
- **L12 — fixed.** Added `beforeSendTransaction` (reusing the existing `scrubSentryEvent`) alongside `beforeSend` in all three Sentry configs (client/server/edge); sampled trace data was previously unscrubbed.
- **L14 — fixed.** Added `export const maxDuration = 60` to `app/capture/layout.jsx` and `app/what-if/layout.jsx` — their pages' server actions (`analyzeAndSaveSelfie`, `runWhatIfSim`) call out to YouCam/Qwen, which can run past Vercel's default 10s function timeout; without this a slow provider response gets killed before the `catch` block that releases the reserved quota slot ever runs. **Still needs confirming against the actual Vercel plan** (Hobby caps lower than Pro) — kept conservative at 60s.
- **L16 — fixed.** Cloudinary `destroy` calls during account deletion now check the response body's `result` field (Cloudinary reports failures with HTTP 200), retry once, and log a visible failure with the `public_id` on exhaustion — previously any failure (including a non-2xx response) was silently swallowed.
- **Report maths bug (not in the original table, found while fixing L8) — fixed.** `generateReport()` used `.filter(Boolean)` on `overallScore`, which drops a genuine score of `0` along with null/undefined, and compared per-metric scores with `!== undefined`, which let a `null` score through to average as if it were a real `0`. Both now use `typeof x === "number"`.

**Not changed in this round:** M17's dashboard-side half (the server-rendered `todayRoutineLog` query is still hardcoded to UTC — needs a stored per-user timezone, a schema+UI change, not a one-line fix; the *client* half is fixed, see below), M21/M22 enforcement choices (see below — the mechanisms exist, nothing is blocked on them), L7 (billing webhook auth — depends on the provider), L13 (data export gaps), L15 (kept deliberately).

## 2026-10-05, second pass (user-requested: M21, M22, M14–M18)

Done with the user's explicit go-ahead, since each changes scoring/UX/storage behavior rather than being a pure bug fix.

- **M22 (Cloudinary private delivery) — fixed, migration not yet run against production.** New selfie/simulation uploads now use Cloudinary's `authenticated` delivery type instead of the public `upload` type (`type: "authenticated"` added to every upload call and its signature). `lib/utils/cloudinary.js`/`cloudinary-sign.js` were generalized to parse and re-sign both delivery types (`parseCloudinaryUrl`, `getCloudinaryDeliveryType`); `applyFaceCropToCloudinary` now signs its result for `authenticated` URLs, since (unlike `upload`) that type 401s on any unsigned fetch — this matters because YouCam downloads the URL from its own servers and our own denoise step fetches it directly. Destroy calls (`deleteImageFromCloudinary`, account deletion) now pass the asset's actual delivery type, since a type mismatch silently destroys nothing. New admin-only, resumable, batched action `migrateImagesToAuthenticated({ dryRun, limit })` flips existing `upload`-type assets in place via Cloudinary's `rename` API (`to_type`, no re-upload of image bytes) and updates the stored URL to match; exposed as a small panel in the admin dashboard (Ops Console → "Image privacy migration") with a dry-run button first. **Not run yet** — needs the live Cloudinary credentials this session doesn't have. New tests in `tests/cloudinary.test.mjs` cover both delivery types. See manual action M8.
- **M21 (email verification) — fixed as defense-in-depth, not a login gate.** `User.emailVerified` (default `false`, `true` for Google sign-ups since OAuth already verified them) plus hashed/expiring token fields. `registerUser` sends a confirmation email (Resend, same pattern as password reset); `GET /api/verify-email` consumes the token; `resendVerificationEmail` (rate-limited) lets a signed-in unverified user ask again, surfaced as a small banner in Settings. Unverified users can still sign in and use the app — H1 already closes the exploit this would otherwise guard against, so making it a hard gate was a product call left to the user, not made here.
- **M14 — fixed.** `getUsageQuotas` counted `Selfie`/`Simulation` documents directly, independent of the `scanUsage`/`simUsage` counters `reserveScanSlot`/`reserveSimulationSlot` actually enforce (`app/lib/quota.js`) — deleting a scan or sim lowered the displayed count without ever lowering the enforced one, so the UI could show room that didn't exist. Now reads the same counters via the same `resolvePeriod` logic the reservation path uses (read-only, nothing is written), so displayed and enforced numbers can't drift apart again.
- **M15 — fixed.** In `analyzeAndSaveSelfie`, the user document (streak/badges) was written via a whole-array `$set` *before* `Selfie.create()`, and the previous photo was deleted before that too — a failure in between left the user's badges/streak advanced with no scan to justify it, or the old photo gone with no new one saved. Reordered to: create the Selfie record first, then update the user (badges via `$addToSet`, not a replace — see below — plus streak/baselineSelfie in one `$set`), then delete the old image last. The catch block's upload-rollback is now guarded by a `selfieCreated` flag so it can't delete an image a Selfie record already references if the *user* update is what failed.
- **M15/race — fixed.** Badges were computed from a snapshot of `user.badges` taken at the top of the function, then written with a plain `$set` of the whole array — two near-simultaneous scans could each compute independently and the later write would silently drop whichever badge the other one added. Now collects only the *new* badge ids and writes them with `$addToSet`, which is race-safe regardless of what else changed the array concurrently.
- **M16 — fixed, three parts.** (1) The streak gap check divided elapsed wall-clock milliseconds by a fixed 24h, so a DST transition (a 23h or 25h local day) could miscount a 1-day gap as 2 and wrongly reset the streak; it now compares local calendar-day **keys** (`getLocalDayKey`, DST-immune) instead of elapsed time. (2) An every-other-day Standard plan's expected cadence is itself a 2-day gap, but only a 1-day gap counted as "kept up", so that plan's streak could never exceed 1 — the allowed gap is now 2 days specifically for that plan. (3) `currentStreak` was only recomputed on the next scan, so a user who stopped scanning kept seeing their old streak forever; `getLatestData` now derives a display-only decayed value (never written back) using the same gap logic, so a lapsed streak shows as broken immediately rather than at the next scan.
- **M17 (partial) — fixed on the client side.** `RoutineChecklist.jsx` called `saveRoutineCompletion` with no timezone at all (always defaulting to UTC) — it now passes the browser's `Intl` timezone, same pattern already used elsewhere in the app. The dashboard's own *read* of `todayRoutineLog` (`app/dashboard/page.jsx`) is still hardcoded to `"UTC"` — fixing that for real needs a stored per-user timezone (onboarding question + schema field), which is a bigger, product-facing change left as Open.
- **M18 — fixed, three parts.** (1) `saveRoutineCompletion` did a plain `findOne` then conditional `create()` for "today's" `RoutineLog` — two concurrent toggles could each see no log and both create one, duplicating the day. Replaced with a single atomic `findOneAndUpdate(..., { upsert: true })`. (2) `step` was stored verbatim from the client with no validation — now whitelisted against the routine actually recommended in the user's latest analyzed selfie (also what keeps the arrays bounded to a handful of real entries) and type/length-checked. (3) The "Routine Master" badge unlocked once *any* AM step and *any* PM step were checked, not all of them — both `saveRoutineCompletion`'s own unlock check and `achievements.js`'s (`getLatestData` evaluates achievements independently and could grant the same badge through that path) now require every step in both lists to be checked.
- **Two more age bugs of the same shape as L9, found while fixing M16** — fixed. `getPercentileRank`'s age-bracket calculation had the identical `currentYear - birthYear` bug as L9; switched to the same `calculateAge()` helper.

New tests: `tests/cloudinary.test.mjs` gained coverage for `authenticated`-type URLs (delivery-type detection, public-id extraction, ownership checks, and — the one that would have silently broken scans — `applyFaceCropToCloudinary` signing its result only when required). `bun run test` (27/27), lint (34/34 baseline, unchanged) and `next build` all still pass after this round.

## 2026-10-05, third pass (user-requested: blank chart, consent flow, email export, plus a scalability/security/legal review)

- **Blank Journey chart — fixed defensively, not confirmed live.** `ProgressChart.jsx` rendered as a plain empty box with no message. Two independent, stackable causes were found and both addressed: (1) it returned `null` with zero explanation whenever there were no analyzed scans with a score to plot — replaced with a "not enough analyzed scans yet" message. (2) its chart container inherited height via `h-full`/`flex-1` through `DashboardSection`'s Framer Motion `height: 0 → "auto"` expand animation — a well-documented Recharts+animated-height interaction where `ResponsiveContainer`'s `ResizeObserver` can capture a transient 0px measurement and never recover, rendering nothing even with valid data. The chart now sits in a fixed-height (`280px`) div that doesn't depend on any ancestor's height resolution. **Not verified against the live app** (no reproduction environment here) — if it's still blank after this, it's cause (1), i.e. a real data gap, not the sizing bug.
- **Scan consent + photo-storage choice — added.** A new one-time, non-dismissible modal (`ScanConsentModal.jsx`) appears the first time a user tries to scan (gated in `capture/page.jsx`'s `handleActionClick`, before the camera/gallery picker opens): a required "I agree to the Terms of Service and Privacy Policy" checkbox plus the existing store-vs-delete photo choice (previously a silent default buried in Settings, never actually asked). `User.termsAcceptedAt` (new field, doubles as a consent timestamp) is set once by the new `acceptScanConsent` action; `analyzeAndSaveSelfie` also rejects server-side if it's unset, so the gate can't be bypassed by calling the action directly. Existing users (who obviously have `termsAcceptedAt` unset) will see this exactly once too, on their next scan — intentional, not a bug: it's the only way to get real consent from users who predate this feature.
- **Export your data by email — added.** New `emailUserDataExport()` (`app/lib/export-data.js`) builds the same ZIP as the existing download and sends it via Resend as an attachment, with a new "export" rate-limit action (3/hour) and a 20MB cap (Resend's message limit is ~40MB; base64 inflates the raw ZIP by ~33%) that fails closed with a clear message pointing back to the direct download for very large exports. Surfaced as a second button ("Email My Data") next to the existing download button in Settings.
- **Found while touching `export-data.js`: a real M22 regression — fixed.** `exportUserData()` fetched `selfie.imageUrl` directly to bundle photos into the ZIP, and included the same raw URL in the JSON manifest. Since M22 switched new uploads to Cloudinary's `authenticated` delivery type, both would 401 for any user exported after that fix. Both now go through `signCloudinaryUrl()` first, same as every other direct-fetch/display path in the codebase (this is also why the M22 write-up above says to grep for `.imageUrl` chokepoints carefully — this one was missed in the original pass).
- **M19, actually completed.** The original finding named four functions; only `getLatestData` was fixed in the first pass. `getWeeklyHistory()` loaded the user's *entire* scan history, unprojected and non-lean, to compute a chart that only ever shows the most recent 12 weeks — now bounded to the last 100 days with a narrow field projection. `getPercentileRank()`'s peer lookup had no limit at all and, unlike the leaderboard, isn't narrowed by location — any user whose age bracket got large (no geography filter) could make this scan a big chunk of the whole user table; added `.select("_id").lean().limit(5000)`, since only `_id` was ever used from the result. `getSavedSimulations()` already had `.lean()` and simulations are inherently rate-limited to a handful a month, so it was left alone.
- **Signup age gate — fixed, found while answering the user's legal-compliance question.** `app/terms/page.jsx` §4 states users must be 18+, but `lib/validations/onboarding.js` only enforced 13+, using the same naive `currentYear - birthYear` subtraction already fixed elsewhere (L9) — meaning a 13-17 year-old could create an account and upload facial biometric data in direct contradiction of the stated Terms, and with real exposure under child-biometric-data rules (Illinois BIPA, GDPR Art. 8) that the 18+ line was presumably meant to sidestep entirely. Now enforces 18+ via `calculateAge()`.

### Scalability, security, legal — findings, not fixes

Answering the user's direct questions required real investigation, not just an opinion; this section is why `AUDIT.md` now says what it says in the summary given back to them. Nothing below was changed without being listed as a fix above — these are the parts that need the user's own decision (legal review, a growth plan) rather than a one-sided code change:

- **Rate limiting is DB-backed (Mongo, atomic `findOneAndUpdate` upserts, TTL-indexed), not in-memory** — correctly built to work across multiple serverless instances, which an in-memory counter would not.
- **Mongo connection pooling is capped at `maxPoolSize: 10`** (`app/lib/mongoose.js`) per serverless instance; fine at the scales discussed (100–10,000 users) on any paid Atlas tier, but worth knowing it's a per-instance cap, not a global one — Vercel can spin up many concurrent instances under load, each opening its own pool.
- **Privacy policy is out of date relative to the actual codebase**, independent of today's fixes: it names MongoDB Atlas, Cloudinary, PerfectCorp/YouCam and Alibaba Cloud/Qwen as processors but never mentions **Resend** (emails, including the new export/verification features) or **Sentry** (error monitoring) — both real processors of user data today. It also describes images as kept only "temporarily... during that session", which undersells how long a `photoPrivacy: store` user's single photo is actually kept (until their *next* scan, which could be weeks later).
- **Cross-border data transfer**: Alibaba Cloud (Qwen) is based in China, which has no EU adequacy decision — if any EU resident's data reaches it (the policy says only numerical scores, not images, but scores are still personal data), that needs a documented transfer safeguard (SCCs or equivalent) that isn't mentioned anywhere. This is a genuine GDPR Chapter V exposure point, not a style nitpick.
- **No lawful basis or retention period stated** for non-image data, which GDPR Art. 13 requires explicitly, and no CCPA-specific disclosures (categories collected/shared, opt-out mechanism framing) beyond "we don't sell images".
- None of the above were rewritten here — redrafting a privacy policy/terms of service is a legal-review task, not something to silently ship. Flagged for the user to take to counsel, with the concrete gaps listed above as a starting point.

---

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
| M2 | Admin OTP attempt limit could be bypassed with parallel requests (read, increment, save) | `app/lib/admin-auth.js:108` | The attempt is counted atomically (`findOneAndUpdate` with `attempts < 5`) *before* comparing; the code is redeemed with a conditional single-use update | Superseded – OTP flow replaced by email + password login (2026-10-04) |
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
| User records and sensitive images isolated | ⚠️ Cross-user image access fixed (H5); new/migrated images use Cloudinary's private `authenticated` delivery (M22) — **migration against live Cloudinary not yet run** (M8) |
| Input validation and upload restrictions | ⚠️ Improved (uploads, simulations, sign-up, timezones, routine steps now whitelisted — M18); location ranges and product data URLs are still loose |
| API integrations handle timeouts and failures | ✅ Timeouts and parse handling added. `maxDuration = 60` added to the capture/what-if routes (L14) — still worth confirming against the actual Vercel plan. |
| Security headers, CORS, rate limiting | ✅ CSP added (nonce + `strict-dynamic`, not yet browser-tested — M7); other headers and rate limiter already in place; login IP trust (L5) still a deployment-target call |
| Consistent errors without sensitive info | ✅ Generic client messages; server logs use error codes/messages, not raw bodies |
| Logging avoids secrets and PII | ⚠️ New logs are scrubbed; `auth-actions.js` still logs an email on reset; Sentry transactions now scrubbed too (L12 fixed) |
| DB queries, indexes, connection management | ✅ The unbounded selfie/lifestyle history query is now capped (M19); leaderboard pre-sort truncation fixed (M20) |
| Dependency audit assessed | ✅ **Upgraded to `next@16.3.8`/`next-auth@5.0.0-beta.32` (C2 resolved)** |
| Production build succeeds | ✅ `next build` passes |
| Critical flows have regression coverage | ⚠️ Unit/regression only for the fixed bugs (27 tests now, up from 17); no integration/E2E against a real database |
| Health checks / graceful failure | ✅ `GET /api/health` added |
| README accurate setup/test/deploy | ✅ Added |
| No unintended UI/feature/data/logic changes | ⚠️ Intentional, documented behaviour changes: the reset page now has a "Continue" button; Google linking removes a pre-existing password (H1); pre-deploy uploads must be re-uploaded once (H5); scoring/streak/routine semantics changed per the user's explicit go-ahead (M14–M18, see §2026-10-05 second pass) — most will shift displayed numbers (usage, streaks, achievement progress) for existing users on next load. |

**As of 2026-10-05 (second pass), every item the user signed off on is fixed and build-verified.** What's left before calling this production-ready is entirely live verification: M1, M3, M4, M7, M8, M9 below, plus the narrower remaining product calls (L7's billing provider, M17's dashboard-timezone half).

## 6. Required manual actions

| # | Action | Why |
|---|---|---|
| M1 | **Re-run a What-If simulation** ("1 product vs none") with a signed-in account and confirm it completes. Also check that an older saved simulation now shows its baseline image. | Confirms the fix for C1 against live Cloudinary/YouCam |
| ~~M2~~ | ~~Upgrade `next`/`next-auth`, sync `bun.lock`~~ | **Done 2026-10-05** |
| M3 | Test password reset end-to-end (request → email → **Continue** → new password → old sessions signed out) | H2/H3 are build-verified only |
| M4 | In Cloudinary, delete any **unsigned** upload preset (e.g. `ml_default`) if nothing else uses it | The app no longer needs one; unsigned presets let anyone upload to your account |
| ~~M5~~ | ~~Decide on M14–M18, M21, M22~~ | **Done 2026-10-05** (user sign-off given) — remaining product calls are narrower now: L7 (billing provider), the M17 dashboard-timezone half, and whether M21 should become a hard login gate |
| ~~M6~~ | ~~Install `@types/node`~~ | **Done 2026-10-05** — now surfaces ~20 pre-existing implicit-`any` issues; not fixed, see §2026-10-05 follow-up |
| M7 | Click through sign-in (credentials + Google), the dashboard, capture, and what-if flows in a real browser with devtools open, watching for CSP violations | The new `Content-Security-Policy` (nonce + `strict-dynamic`) has only been verified by a successful build, never against a live page load |
| M8 | Run the admin dashboard's "Image privacy migration" panel: **Dry run** first, read the counts, then **Migrate next batch** repeatedly until remaining counts hit 0. Then re-check a saved simulation and the dashboard's latest photo still load. | M22 — the code path (new uploads, signing, destroy) has only been verified by a successful build and the unit tests in `tests/cloudinary.test.mjs`; nothing has touched the live Cloudinary account yet |
| M9 | Sign up a fresh test account and confirm the confirmation email arrives and the link works (`/api/verify-email?token=...` → redirects to `/sign-in?notice=email_verified`) | M21 is build-verified only; Resend delivery/the token round-trip haven't been exercised live |
