# TintKin: Repositioning Changes

Living document. Section 1 is the plan (what we decided). Section 2 is the log of what has actually been changed in the code. Update both as we go.

**Status (2026-10-24):** everything below is committed and pushed on the PR branch `feat/skin-plan-repositioning` (PR open, Vercel preview builds from it). 102 tests pass, eslint is clean on touched files (3 old `set-state-in-effect` errors remain in untouched files), the production build passes. **Not yet clicked through in a browser**: an automated Playwright run got through sign-in and onboarding steps 1-2, then hit the login rate limit (see "Browser testing" below). (This file is git-ignored by the `*.md` rule, so it lives only on this machine.)

---

## 1. Plan

### 1.1 Why

Testers treat TintKin as "get a skin score". They ask "what am I getting by only getting my face result?" The scan is complete in itself, so nothing pulls the user forward. We want the product to read as an **improve-your-skin** product, where the scan is only the starting point.

**New loop:** Scan (baseline) → Personal 30-day plan → Daily routine with Kin → Weekly check-in scan → Visible progress

**Positioning language**
- Use: skin plan, improve, progress, routine, starting point, check-in.
- Avoid: "skin score" as the headline, "AI skin analysis", "find your skin type", "scan again".
- Tagline direction: "Your skin, getting better."
- Promise: time-bound, "See your first change in 4 weeks."

### 1.2 Decisions made

| Topic | Decision |
|---|---|
| Daily scan cap | Raise from 1/day to **max 5/day**. Show it in the UI ("2 of 5 today, N left this month"). Stops lighting-noise trends and burning the month in one go. |
| Remove | The hardcoded `SCAN_DAILY_LIMIT = 1` and the Standard "every other day" pacing (leftover from the scan-centric model). |
| Scan allowances | **Standard: 6 scans/month. Pro: 12 scans/month.** Our focus is no longer scanning. |
| Prices | **Standard $8/mo, Pro $15/mo** (down from $12 / $24). Free stays at **2 scans**. |
| Pro differentiation | Sell things that don't cost us money: **reports**, plan adjustments after each check-in, custom product uploads, more simulations. No "Daily Scans". |
| Default rhythm | Daily = routine (free to us). Weekly = check-in scan (suggested, e.g. "Next check-in: Sunday"). Extra scans within the allowance are a bonus. |
| Plan | Replace the scan side-effect advice with a **user-level 30-day plan** (see 1.4). |
| Onboarding | Add a **selfie step** so the first minute produces a personalized plan with a live analysis screen. Plan reveal is the first screen after it. |
| Tutorial | Kin tutorial gets skipped, so move guidance to the moments it's needed (see 1.5). |

### 1.3 Cost reference (YouCam is the real cost, not Cloudinary)

- Scan = 9 YouCam credits ≈ **$0.43**; simulation = 4 credits ≈ **$0.19** (`lib/constants/credits.js`).
- Worst-case scan cost per user per month: Free (2 scans) ≈ $0.86, Standard (6) ≈ $2.59, Pro (12) ≈ $5.18, before Polar fees and Qwen.
- Cloudinary bills on storage/transforms/bandwidth, and one selfie per user keeps it negligible.
- Every completed onboarding selfie costs about $0.43, so consider abuse controls (rate limit, verified email).

### 1.4 Plan redesign (user-level 30-day plan)

Problems with the current plan (`app/lib/qwen.js`, `app/routine/page.jsx`, scan flow in `app/lib/actions.js`):
1. Exists only because a scan ran. The AI sees about 6 numbers plus profile.
2. Stored per scan (on each `Selfie`). `saveRoutineCompletion` checks ticks against the latest scan's exact text, so the checklist is fragile across re-scans.
3. No phases, no target, no "why this step", no link between progress and the plan.
4. Prompt forces vague "behavioral, not prescriptive" steps.
5. Never adapts to what the user actually did.

Target shape:
- Stored on the **user** (versioned), not on each scan.
- Has a focus area and a measurable target (e.g. radiance 58 → 65).
- Weekly phases: foundation, add a targeted active, build, check-in.
- Each step has a "why this is for you" line and a stable id (so completion tracking survives re-scans).
- Check-ins (suggested day 7 / 14 / 28) **adjust** the plan instead of regenerating it.
- Progress view ties changes in metrics back to the plan.

### 1.5 UX and flow changes

**Landing / marketing**
- Lead with the journey (Scan → Plan → Routine → Progress) and a before/after progress visual instead of a score card.
- Reword headings and CTAs per 1.1.

**Results / dashboard**
- Show the score as a **starting point** with a target, not a verdict.
- "Your next step" card on the results screen: one CTA (start your plan).
- Kin talks about the user's results, not about the app.
- First-week checklist on the dashboard (scan done, goal set, first routine, reminders on).
- Dashboard hero = change over time (trend, streak) rather than the latest number.
- Use weekly/rolling-average trend rather than the latest single scan; add scan-quality guidance (lighting, no makeup, same spot).
- Re-scan framed as a payoff: "Check your progress" with a countdown/reminder.
- Hide extras (e.g. leaderboard) until the user has done a few things.

**Onboarding**
- Keep: age/sex, skin type, goals. Add: lifestyle basics, consent (terms and photo privacy), selfie.
- "Do this later" option that gives a basic plan.
- Retry on face-not-detected without consuming the scan.
- Live analysis screen with **real** stages (uploading, analyzing, building plan), no fake percentages.
- End on the plan reveal, not the dashboard.

**Pricing page**
- Reword tiers around plan / progress / reports instead of scan counts.
- Update the compare table and tier taglines.

### 1.6 Open questions

- [x] ~~Exact new prices~~ Standard $8, Pro $15.
- [x] ~~Free tier~~ stays at 2 scans. Still to confirm: the onboarding selfie counts as the first of them (assumed).
- [x] ~~Report model~~ built as option A (see log). Original notes: Today a report unlocks after 7 scans (`SCANS_PER_REPORT` in `lib/constants/reports.js`). At 6 scans/month Standard users need 2 months and Free users 4 months, which clashes with selling reports. Options on the table:
  - **A (recommended): reports follow the plan's check-ins** (day 7, 14, 28). A report is generated when a check-in scan is completed, so it needs one new scan and says "here is how your plan is going".
  - **B: every 5 or 7 days**, needing at least one new scan in that window. Simple, but a 5-day timer doesn't line up with a weekly check-in rhythm.
  - **C: just lower `SCANS_PER_REPORT` to 4.**
  Not changed yet; waiting on the choice.
- [x] Plan length: 30 days (built that way; phase and check-in days live in `lib/constants/plan.js` so changing it later is a constants edit).
- [ ] Should the onboarding scan require a verified email?
- [ ] Pro tier final feature list. What exists today for Pro: 12 scans, 4 simulations, custom product uploads. Plan adjustments after check-ins are available to every tier (not gated). If Pro should sell reports or plan features, they need gating work.
- [ ] Onboarding scan cost: a completed signup now costs about $0.43 (YouCam) plus Qwen. Rate limits exist; decide whether to require email verification first.

### 1.7 Suggested build order

1. ✅ Pricing numbers, tier limits and copy (quotas, pricing page, scan-limit messages).
2. ✅ Daily cap of 5 and the UI for it; remove every-other-day pacing.
3. ✅ Plan data model and generation (user-level, structured, versioned).
4. ✅ Plan UI (routine page, plan reveal, progress tied to plan).
5. ✅ Onboarding with selfie and live analysis.
6. ✅ Results/dashboard reframing, first-week checklist, Kin guidance, tester pop-up.
7. ✅ Landing page and marketing copy.

Built but not yet seen in a browser. Not committed.

---

## 2. Changes made so far

Log each change below with the date, files touched and a short note (and commit hash once committed).

| Date | Change | Files | Commit |
|---|---|---|---|
| 2026-10-23 | Created this document (planning only, no code changes) | `CHANGES.md` | not committed |
| 2026-10-23 | **Build step 1 + 2: limits, pricing, daily cap.** Standard 15 → 6 scans/mo, Pro daily (31) → 12 scans/mo, Free unchanged at 2. Daily cap 1 → 5 on every tier (exported `SCAN_DAILY_LIMIT`). `getTierScanLimits(tier)` no longer takes `daysInMonth`. | `lib/constants/quotas.js`, `app/lib/actions.js` | not committed |
| 2026-10-23 | **Removed every-other-day pacing** end to end: scan denial reason, quota check, streak gap helper, settings validation, profile payload, `updateUserTier` param, Settings "Scan Pacing" control, pricing "Choose your rhythm" modal (Standard now goes straight to checkout), `standardPlanFrequency` schema field (old values are simply ignored). | `lib/constants/tiers.js`, `lib/constants/quotas.js`, `lib/validations/settings.js`, `app/lib/mongoose.js`, `app/lib/actions.js`, `app/components/SettingsModal.jsx`, `app/pricing/PricingClient.jsx` | not committed |
| 2026-10-23 | **Pricing copy and numbers**: $8 / $15 on cards, compare table (2 / 6 / 12 scans), SEO description, JSON-LD offers (pricing page and root layout), FAQ rewritten ("How many scans do I need?"), footnote about weekly check-ins and the 5/day cap. Tier taglines reworded around improving skin. | `app/pricing/PricingClient.jsx`, `app/pricing/page.jsx`, `app/layout.js` | not committed |
| 2026-10-23 | **Scan allowance in the UI** on the capture screen: "N of 5 scans left today · M left this month" under the shutter and in the side chip. Limit-reached copy reworded (daily limit names the 5 cap, monthly says the routine keeps working). Server error messages match. | `app/capture/CaptureClient.jsx`, `app/lib/actions.js` | not committed |
| 2026-10-23 | Tests updated: tier scan limits (2 / 6 / 12, daily 5) replace the days-in-month and 15-scan cases; streak test renamed (the `allowedGapDays` option still exists, no plan uses it now). `bun run test`: 49/49 pass. | `tests/reports-quotas.test.mjs`, `tests/streak.test.mjs` | not committed |
| 2026-10-23 | **Build step 3: plan data model (no UI yet).** New user-level 30-day `Plan` collection (one active plan per user, enforced by a partial unique index). Steps have stable ids and their own start/end plan day, so a plan can be adjusted at a check-in without rewriting history. Four fixed phases (Foundation 1-7, Target 8-14, Build 15-21, Lock in 22-30), check-ins on days 7 / 14 / 28 (a scan up to 2 days early counts; skipped ones become "missed"). Focus = the 2 weakest metrics, each with a realistic target (about 15% of the gap to 100, min +3, max 95). New `lib/constants/plan.js` (all the numbers), `lib/plan/build.js` (pure: targets, focus, AI-draft sanitising, rule-based fallback plan, `buildPlan`), `lib/plan/state.js` (pure: plan day, steps for a day, new-this-week steps, check-in recording, progress, `applyAdjustment`, `toPlanView`). | `lib/constants/plan.js`, `lib/plan/build.js`, `lib/plan/state.js`, `app/lib/mongoose.js` | not committed |
| 2026-10-23 | **Plan generation and adjustment (server).** `generatePlanDraft` (Qwen writes a base routine plus what each later phase ADDS, each step with a "why this is for you" line) and `generatePlanAdjustment` (after a check-in, sees scores moved + 7-day routine consistency, may drop steps by id and add new ones). If the AI fails, a rule-based plan is stored instead, so a user always gets a plan. `app/lib/plan.js` (server-only): `ensureActivePlan`, `startNextPlan`, `recordScanOnPlan`, `adjustPlanAfterCheckIn` (idempotent per check-in, version-guarded). `app/lib/plan-actions.js` (server actions): `getActivePlan`, `ensurePlan`, `startNextPlanAction`, `reviewCheckIn`, all returning a JSON-safe plan view and rate limited (5 AI calls/hour/user). | `app/lib/qwen.js`, `app/lib/plan.js`, `app/lib/plan-actions.js` | not committed |
| 2026-10-23 | **Scans now feed the plan.** After a scan is saved, `recordScanOnPlan` refreshes the plan's latest snapshot and completes a due check-in. Cheap (no AI), best-effort, cannot fail the scan. Plans are NOT created inside the scan request (that would add another AI call to every first scan); they are created on demand by `ensurePlan`. | `app/lib/actions.js` | not committed |
| 2026-10-23 | 15 new tests for the pure plan logic (targets, focus, sanitising, fallback, stable ids, day maths, phases, check-ins, progress, adjustments, JSON-safe view). `bun run test`: 64/64 pass. | `tests/plan.test.mjs` | not committed |
| 2026-10-23 | **Build step 4: Plan UI.** `/routine` is now "Your Plan" (nav label Routine to **Plan**; URL unchanged): day X of 30 and phase header, check-in card (a call to action when due, a countdown otherwise), the checklist from the plan's steps for today with a "New this week" badge and a tap-open "Why this is for you" line on each step, "Your 30-day aim" progress bars (start, now, aim), and a phase and check-in timeline. Accounts without a plan (all existing testers, first visit) see a "Building your 30-day plan" card that calls `ensurePlan` and refreshes. After a check-in scan the page shows "Reviewing your check-in…" (calls `reviewCheckIn`) then the coach's note. When 30 days are up a "Start my next 30 days" card appears. New components in `app/plan/`. Workout, products and What-If link are unchanged below. | `app/routine/page.jsx`, `app/plan/*` (PlanHeader, PlanProgress, CheckInCard, PlanTimeline, PlanBuilder, CheckInReview, NextPlanCard, PlanTodayCard), `app/dashboard/RoutineChecklist.jsx`, `app/components/nav-items.js`, `lib/plan/state.js` | not committed |
| 2026-10-23 | **Today screen leads with the plan.** New plan card above the score (day X of 30, steps left today, the two focus bars, a check-in button when due). The score card is kept but gains a "Started at 62 · +4" chip so it reads as progress. Users without a plan get the builder card there too. First-scan welcome copy reworded (starting point, 30-day plan). | `app/dashboard/page.jsx`, `app/dashboard/TodayView.jsx`, `app/dashboard/FirstScanWelcome.jsx` | not committed |
| 2026-10-23 | **Ticks now use plan step ids.** `saveRoutineCompletion` whitelists against today's plan step ids (falls back to the latest scan's text when there is no plan). Every reader that counts or matches today's routine goes through one helper, `getTodayRoutineKeys`: dashboard counts, achievements ("routine master"), yesterday/consistency stats, the companion state and the push-reminder cron. Without a plan everything behaves exactly as before. Old `RoutineLog` entries (text) stay valid history. | `app/lib/plan.js`, `app/lib/actions.js`, `app/api/cron/reminders/route.js` | not committed |
| 2026-10-23 | Plan view gets `pendingReview`; one more test. 64/64 tests pass; eslint clean on touched files. | `lib/plan/state.js`, `tests/plan.test.mjs` | not committed |
| 2026-10-23 | **Build step 5: onboarding with a selfie.** After the three info steps the user now lands on a new `/welcome` flow (focused shell, like onboarding): intro with their goals and photo tips, consent (existing terms + photo-privacy modal, only if not yet accepted), take or upload a photo, crop, preview, then a **live analysis screen with real stages** (uploading, analysing, building your plan; each ticks when the actual call returns, no fake percentages), then a **plan reveal**: starting point score, the two focus areas with their 30-day aim, and day-1 steps with their "why". "I'll do this later" goes to the dashboard. A failed analysis or plan build shows a retry (a failed scan never uses up the allowance; if the scan saved but the plan failed, only the plan is retried). Accounts that already have a scan but no plan skip straight to plan building. The first-scan welcome on Today now links here too. The onboarding scan counts as one of the monthly scans (Free: 2). | `app/welcome/page.jsx`, `app/welcome/WelcomeClient.jsx`, `app/lib/plan-actions.js` (`getWelcomeState`), `app/onboarding/page.jsx`, `app/components/AppShell.jsx`, `proxy.js`, `app/dashboard/FirstScanWelcome.jsx` | not committed |
| 2026-10-23 | **Check-in flow end to end.** A scan that completes a plan check-in now returns `checkInCompleted`, and the capture screen sends the user to the Plan page (instead of Today) where the coach reviews it. | `app/lib/actions.js`, `app/capture/CaptureClient.jsx` | not committed |
| 2026-10-23 | **Build step 6: guidance and framing.** *First-week checklist* on Today (scan, plan, first routine tick, week-1 check-in; hides when done or after day 14). *Kin* is plan-aware: first-scan offer points to `/welcome`, quiet on `/welcome`, the Today tour starts with the plan card and calls the score "your starting point", scan nudges only appear when a check-in is due (otherwise Kin asks for the routine), tips reworded for weekly check-ins, greetings say "Plan". *Push reminders*: the morning nudge asks for the routine (opens the Plan) unless a check-in is due, evening copy no longer asks for a scan (new test). *Tester pop-up*: one-time "What's new" modal for accounts created before the cutoff in `lib/constants/announcements.js` (**2026-10-30, change it to your deploy date**), dismissal stored per user (`seenAnnouncements`), "Show me my plan" goes to the Plan page. | `app/dashboard/FirstWeekChecklist.jsx`, `app/dashboard/AnnouncementModal.jsx`, `app/dashboard/page.jsx`, `lib/constants/announcements.js`, `app/lib/announcement-actions.js`, `app/lib/mongoose.js`, `app/components/companion/brain.js`, `app/lib/actions.js` (companion state: `hasPlan`, `checkInDue`), `lib/push/reminders.js`, `app/api/cron/reminders/route.js`, `tests/reminders.test.mjs`, `tests/plan.test.mjs` | not committed |
| 2026-10-23 | **Build step 7: landing page and metadata.** Hero: "Improve your skin in 30 days." with "Build my free plan" CTAs; features now lead with the plan, routine, weekly check-ins; how-it-works is Scan once / Follow your plan / See it improve; the phone mock shows a plan card (day 9 of 30, focus bars) instead of a score; final CTA mentions the free plan and the $8 entry price. Site title, description, manifest, Open Graph and JSON-LD reworded away from "AI skin analysis". | `app/HeroSection.jsx`, `app/page.js`, `app/layout.js`, `app/manifest.js` | not committed |

| 2026-10-24 | **Polish pass.** Copy cleanup away from "AI analysis / skin score / scan again": capture and dashboard page metadata, auth-page benefits, routine product blurb, JSON-LD descriptions (layout, pricing), Today "Reports" tile. Leaderboard tile on Today now hidden until the user has 3 routine days. Terms/privacy deliberately untouched (legal wording). Lint clean, 66/66 tests. | `app/capture/layout.jsx`, `app/dashboard/layout.jsx`, `app/components/AuthLayout.jsx`, `app/routine/page.jsx`, `app/layout.js`, `app/pricing/page.jsx`, `app/dashboard/TodayView.jsx`, `app/dashboard/page.jsx` | not committed |

| 2026-10-24 | **Report model A: reports follow plan check-ins.** Each completed check-in (day 7 / 14 / 28) unlocks exactly one report; no more 7-scan counter. Content is built from plan data (no AI): overall change vs the previous check-in (or the starting point), focus areas "58 → 61 (aim 65)", metrics, honest next-step notes (a dip is framed as lighting/sleep noise). Oldest unreported check-in first so none are lost; a unique index (`userId, planId, checkInDay`) stops double reports. Status is now `{ready, checkInDay, hasPlan, nextCheckInDay}`; the email, Reports page, dashboard prompt and Kin all follow. Accounts with no plan get no report until they have one. `lib/constants/reports.js` deleted. | `lib/plan/report.js` (new), `app/lib/actions.js`, `app/lib/mongoose.js`, `app/lib/email.js`, `app/reports/*`, `app/dashboard/ReportReadyPrompt.jsx`, `tests/reports-quotas.test.mjs` | not committed |
| 2026-10-24 | **Privacy and Terms updated** for the plan model (plan/routine data, notification subscriptions, onboarding selfie, what Qwen receives: scores, plan progress, age/sex/skin type/goals; no images, name or email). Dates set to Oct 24, 2026. Worth a read by whoever owns legal sign-off. | `app/privacy/page.jsx`, `app/terms/page.jsx` | not committed |
| 2026-10-24 | **Rolling-average trend.** Progress chart line is now the 7-day trailing average; single scans are faint dots. Page copy explains that dots are not a verdict. | `lib/utils/trend.js` (new), `app/dashboard/ProgressChart.jsx`, `app/progress/page.jsx`, `tests/streak.test.mjs` | not committed |

| 2026-10-24 | **Evolution: plan first, scan optional.** (1) *Onboarding* is now an 8-step questionnaire (age/sex, skin type + sensitivity, Fitzpatrick sun reaction, up to 3 ranked concerns, 1-5 self-rating of each, current products, sleep/sun/stress/smoking, pregnancy + time available), stored as `user.skinProfile`. (2) *Rules engine* `lib/plan/engine.js` builds the plan (no AI for the routine): barrier-first week 1, then one new active at a time from the top concern, with safety rules (no retinoids/strong acids when pregnant or unsure or sensitive, never two strong actives, gentler on deeper skin tones to avoid PIH, no duplicate of what they already use, quick routines add fewer steps). Plans are generated with no scan (`generatedBy: "rules"`); focus is self-rated (1-5, `scale: "rating"`), old scan plans keep working (`scale: "score"`). (3) *Check-ins* are a 30-second self-rating (`RatingsForm`, `submitCheckInRatings`); a scan is an optional extra that adds measured numbers, and the first scan becomes the measured baseline (it does not count as a check-in). Reports use ratings (scaled to 100) plus scan numbers when present. (4) */welcome* rebuilt: live typed "analysis" that explains what the engine did with their answers, then a reveal of floating coloured cards (profile chips, focus areas with start/aim track, safety, first day with tap-open "why", week-by-week unlocks) and **Kin chat** (`chatWithKin`): "does this feel right?" with chips and free text; Kin edits the plan (AI proposes drops/adds, server bounds + safety-filters them, version-guarded, applies today while the plan is brand new). (5) *Scan is no longer required anywhere*: Plan, Progress, Share and Today work without one (Today shows a plan-first layout and an optional "see progress in numbers" card), no redirects to /capture, Kin/reminders/nav copy reframed ("Progress scan"). Next-30-days plans carry the latest ratings forward. | `lib/plan/engine.js` (new), `lib/plan/state.js`, `lib/plan/build.js`, `lib/plan/report.js`, `lib/constants/profile.js`, `lib/constants/plan.js`, `lib/validations/onboarding.js`, `app/lib/plan.js`, `app/lib/plan-actions.js`, `app/lib/qwen.js` (adds `generatePlanEdit`, drops `generatePlanDraft`), `app/lib/mongoose.js`, `app/onboarding/page.jsx`, `app/welcome/*`, `app/plan/RatingsForm.jsx`, `app/plan/CheckInCard.jsx`, `app/plan/PlanProgress.jsx`, `app/routine/page.jsx`, `app/progress/page.jsx`, `app/dashboard/*`, `app/components/companion/*`, `app/globals.css`, `tests/engine.test.mjs` (new) | committed on the PR branch |

| 2026-10-24 | **Code-review fixes.** Safety word lists now cover brand/alternate names (Differin, Retin-A, tazarotene, retinyl, vitamin A) and lactic/mandelic acids. Profile-save safety sweep and "update my plan" re-read and retry on a conflict (new `rev` guard also protects scan and self-rating writes from overwriting each other). Steps that start later can be dropped, Kin/check-in prompts list upcoming steps, and duplicates of upcoming steps are refused; on day 30 a replacement takes over instead of overlapping. "Update my plan" keeps what Kin/check-ins added and does not bring back what the person dropped (adjustments now record `source`). A scan-completed check-in only unlocks its report once ratings are in; the report-ready email also fires after a self-rated check-in (helpers moved to `app/lib/report-notify.js`). Engine only marks an ingredient used when the step is really added. Stale comment fixed. **Not changed:** the monthly scan cut (Standard 6, Pro 12) is the pricing decision, so existing paying users lose scans on deploy unless grandfathered. | `lib/plan/engine.js`, `lib/plan/state.js`, `lib/plan/rebuild.js`, `lib/plan/report.js`, `app/lib/plan.js`, `app/lib/plan-actions.js`, `app/lib/actions.js`, `app/lib/report-notify.js` (new), `app/lib/qwen.js`, `app/lib/mongoose.js`, `tests/review-fixes.test.mjs` (new) | committed on the PR branch |

| 2026-10-24 | **Security hardening (from /security-review follow-up).** (1) *Health answers encrypted at rest*: `skinProfile.pregnancy` and `skinProfile.sensitivity` are AES-256-GCM encrypted by the User schema (`lib/utils/field-crypto.js`, key `FIELD_ENCRYPTION_KEY`, format `enc:v1:iv:tag:ct`); reads through a document decrypt (use `toObject({ getters: true })` / `toPlainUser`), writes also seal explicitly (`sealSkinProfile`). Production fails closed with no key; legacy plaintext still reads; an unreadable value counts as "unsure" pregnancy / "high" sensitivity so plans stay cautious. `scripts/encrypt-health-fields.mjs` migrates old rows (dry run by default, `--apply` to write; dry run found 0 accounts). (2) *Allow-list for AI additions*: for pregnant, unsure or sensitive users, steps proposed by Kin or a check-in may only be kinds the engine itself recommends (cleanse, moisturise, SPF, niacinamide, azelaic, hyaluronic, ceramides, peptides, gentle habits, vitamin C unless sensitive); everyone else keeps the deny-list. The profile-save sweep and the update-plan merge use the deny-list only (`filterNotDenied`), so harmless existing steps are never stopped. | `lib/utils/field-crypto.js` (new), `lib/plan/engine.js`, `lib/plan/rebuild.js`, `app/lib/mongoose.js`, `app/lib/actions.js`, `app/lib/plan.js`, `app/lib/plan-actions.js`, `scripts/*` (new), `tests/security-hardening.test.mjs` (new) | committed on the PR branch (`a134969`) |

### To do later (you)

- [x] `FIELD_ENCRYPTION_KEY` generated and set on **Preview and Production** (hidden secrets) and in `.env.local`. **Keep a copy somewhere safe (password manager): if it is lost the encrypted answers cannot be recovered.** Every environment that shares the database must use the same key.
- [ ] Delete the test account `tk-e2e-1792859742959@example.com` (created by the automated browser run) from the admin portal. It sits in the shared database.
- [ ] If you ever add an admin/export view of user documents, read health fields through the model getters, not `.lean()`.
- [ ] **Polar prices.** In the Polar dashboard, change the Standard product to **$8/mo** and the Pro product to **$15/mo** (`POLAR_PRODUCT_ID_STANDARD`, `POLAR_PRODUCT_ID_PREMIUM`). The site already advertises $8 / $15, but checkout charges whatever Polar has, so do this before deploying.
- [ ] Set the announcement cutoff in `lib/constants/announcements.js` to your deploy date (accounts created before it see the one-time "What's new" pop-up).
- [ ] Click through the new screens with a real account: `/welcome` (consent, photo, live stages, reveal), the Plan page states, Today with the plan card and first-week checklist, and the pop-up.

### Planned (not built yet)

- **Plan UI leftovers** (step 4 is built; these were consciously left):
  - Plan generation ignores the UV index (the old per-scan advice used it for sunscreen advice). Add if wanted.
  - `Selfie.amRoutine` / `pmRoutine` are still generated on every scan (one AI call) and still used for the product picks, the facial workout and users with no plan. Once every active tester has a plan, that routine part of the advice prompt can be dropped to save a bit of AI time.
  - Not seen in a browser yet: only lint, unit tests and a production build have run. Needs a click-through with a real account (empty state, building state, day 1, a due check-in, an expired plan).
  - From the original UI plan, not done: scan-quality warnings on a bad read (leaderboard hiding and rolling-average trend are done). Say if you want any of these.
  - Other copy that still says "score" or "AI analysis": terms, privacy, README, sign-in/sign-up pages, the What-If page.

### Not changed yet (known leftovers)

- `tsc` type-check errors and 3 `react-hooks/set-state-in-effect` lint errors already existed in files this work didn't touch.
- A free user's 2 monthly scans are the onboarding baseline plus one check-in, so the day-7 and day-14 check-ins can't both happen in the same month without credits or an upgrade. That follows the 2-scan decision but is worth watching with testers.

### Browser testing (state on 2026-10-24)

- Headless Chromium via Playwright lives in `C:\Users\FBC\AppData\Local\Temp\tk-e2e` (outside the repo). Scripts: `flow1.mjs` (sign in, 8-step onboarding, building screen, reveal, screenshots in `shots/`).
- Verified so far: sign-in, onboarding steps 1-2 render and advance (button accessible names are lowercase for skin types, e.g. "combination ...").
- Blocked: repeated test logins tripped the login rate limit (DB-backed, ~19 min lockout). The shared database is the production cluster, so I did not clear the counters. Next run: wait it out, or point the dev server at a separate test database, and log in once per run.
- Still to test by hand (or by script): building screen typing, reveal cards, Kin chat (calls Qwen), Start my plan, Plan page ticks, self-rated check-in + report unlock, `/profile/skin` (save, safety note, update vs start over), the "update your profile" banner on an old account, the What's-new pop-up, desktop layout.

### Next session (suggested order)

1. Do the manual items above (Polar prices, announcement cutoff).
2. Click through the new screens with a tester account and note anything off (layout, copy, the AI plan quality, the day-7 check-in and coach note).
3. Decide the report model and build it (recommended: reports follow check-ins).
4. Decide the remaining open questions (Pro features, verified email before the onboarding scan).
5. Optional polish from the original UI plan: hide the leaderboard early, rolling-average trend, scan-quality warnings, copy cleanup in terms, privacy, README, sign-in pages and What-If.
6. When you are happy: review the diff and commit (nothing has been committed so far; the working tree has about 40 changed or new files).

| 2026-10-25 | **UX pass on onboarding and Today.** *Onboarding:* every step now fits one screen (fixed-height card, compact tiles, 2-column grids, Continue pinned at the bottom, content scrolls only on very small phones); sensitivity is its own step (9 steps); tiles never change size when tapped (tick overlaid, ring instead of border change); Kin is inline above Continue and writes a short reaction to every answer ("writing that down"), the floating Kin is hidden on `/onboarding`. *Kin:* bigger close button, tap outside closes a message, "Hide Kin" link (comes back via Profile). *Plan page:* Morning/Evening tab on phones keeps one height (both lists share a grid cell). *Today:* removed the Today's Focus and Today's Plan cards (the plan card is the one way in, now with an "Open today's steps" button), skin age sits opposite the name, detailed score card below it. *Type and contrast:* muted text darkened (rose `#6B4651`, terracotta `#704F42`), eyebrows use accent-deep and bold, micro text 12px, card titles 16px. Not yet seen in a browser. | `app/components/SkinQuestionnaire.jsx`, `app/onboarding/page.jsx`, `app/components/companion/Companion.jsx`, `app/components/companion/brain.js`, `app/dashboard/RoutineChecklist.jsx`, `app/dashboard/TodayView.jsx`, `app/dashboard/skin-summary.js`, `app/plan/PlanTodayCard.jsx`, `app/globals.css` | committed on the PR branch |

| 2026-10-25 | **Multi-month plans, Kin memory, Today layout.** *Plan length:* people choose 1 / 3 / 5 / 7 months or any 1 to 12 (`DurationPicker`), as a new last step of the questionnaire (so new users and anyone editing their profile get it), a one-time "How long shall we work on your skin?" card on Today for accounts never asked (`PlanLengthPrompt`), and "Change plan length" on the Plan page (`setPlanLength`, never below the month you are in). Each month is its own 30-day `Plan` (`monthIndex`, `totalMonths`), so records stay per month. *Month review:* when a month ends, `lib/plan/review.js` (pure) reads the records (focus areas moved, share of the last 14 plan days with a ticked step) and proposes changes in plain words (make a stalled area top priority, put a reached area on maintenance, go lighter if consistency was under 40%). The person answers "Yes, update my plan" or "No, keep it the same"; the server recomputes the proposals itself. Either way the running routine carries over as week 1 of the next month (`buildDraft` `carry`), nothing already used is added twice, and the safety filters apply. Finishing the last month offers "keep going for another month". *AI:* Kin edit and check-in prompts now say which month of how many and prefer at most one new active in later months. *Kin:* walkthrough flag now lives on the account (`user.seenTours`, `markTourSeen`) so it is offered once, not at every sign-in (device-only history is synced up); Kin stops after 2 unprompted messages in a row until you tap it; Kin appears about a second after the page has loaded; new skeletons for Today and Plan. *Today:* streak is a small chip with a popover (goal, milestones, share), your photo with skin age sits by your name, score card is shorter, plan card is tighter with the button right under the headline, and the first-week checklist moved under it. | `lib/constants/plan.js`, `lib/plan/review.js` (new), `lib/plan/engine.js`, `lib/plan/build.js`, `lib/plan/state.js`, `lib/validations/onboarding.js`, `app/lib/plan.js`, `app/lib/plan-actions.js`, `app/lib/tour-actions.js` (new), `app/lib/actions.js`, `app/lib/qwen.js`, `app/lib/mongoose.js`, `app/components/DurationPicker.jsx` (new), `app/components/SkinQuestionnaire.jsx`, `app/components/companion/Companion.jsx`, `app/plan/*` (NextPlanCard rewritten; PlanLengthEditor, PlanLengthPrompt new), `app/dashboard/*` (StreakChip new, TodayView, page, loading), `app/routine/loading.jsx`, `app/progress/loading.jsx`, `app/profile/ProfileClient.jsx`, `tests/months.test.mjs` (new) | committed on the PR branch |

| 2026-10-25 | **Loading, plan length flow, cream surfaces.** Kin and the top-bar/sidebar avatars show only once their data has arrived (no timer); skeleton until then. The plan-length card on Today is gone: accounts never asked are sent to `/profile/skin?step=length`, the same questionnaire opened at that one question (saves and returns to Today, nothing rebuilt; unanswered older questions send the person back to them). First-week checklist now really sits under the plan card. New cream `--color-paper` token per theme replaces `bg-white` on tiles, inputs, chips and modals, and card surfaces are creamier (share card, cropper, radar chart and admin keep white). | `app/components/companion/Companion.jsx`, `app/components/AppShell.jsx`, `app/components/SkinQuestionnaire.jsx`, `app/profile/skin/*`, `app/dashboard/page.jsx`, `app/globals.css`, ~20 components (`bg-white` to `bg-paper`) | committed on the PR branch |
