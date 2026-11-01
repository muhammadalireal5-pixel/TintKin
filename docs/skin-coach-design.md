# TintKin Skin Coach: Product and Engine Design

Status: draft for sign-off · Version 3 · 2026-10-30 · Nothing in this document is built yet. Version 3 adds the confirmed YouCam and LLM limits to section 20 and sizes the scan queue from them.

## 1. What we are building

TintKin becomes a daily skin coach: a programme you follow like a workout plan, built for one person's skin, habits and time, and adjusted by what actually happens. Every day the app gives a short session (routine, face workout, one or two habits), explains why, and adapts tomorrow's session to today's reality.

The product promise, in plain words: *a routine that fits you, a reason for every step, and visible progress you can trust.*

Who it is for: skin enthusiasts who will follow a plan and want to see it work. Revenue is subscription (SaaS). TintKin does not sell products.

### Principles

1. **Safety is structural.** Hard rules decide what is allowed before anything is scored or suggested. No AI output reaches the plan without passing them.
2. **Honest about evidence.** Every claim the app makes matches the strength of the evidence behind it (section 3).
3. **Cheap signals daily, expensive signals rarely.** Ticks, taps and logs drive the daily loop. Scans are scheduled or earned.
4. **Adapt down quickly, up slowly.** A bad day lowers intensity at once. Stepping up needs sustained evidence.
5. **Everything explainable.** Each item and each change records why, in data, before the LLM puts it into words.
6. **Deterministic core.** The same inputs and knowledge version always produce the same plan, so plans are reproducible and testable.

## 2. Decisions already made

| Decision | Choice |
|---|---|
| Customers | Skin enthusiasts, subscription. No product sales. |
| Clinical advisor | None for now. Narrow claims, structural safety, red-flag escalation. |
| Supplements | Not in v1. Food-first information only, no doses. |
| Programme length | Built from 2-week blocks: 2, 4, 8, 12 weeks or custom, up to 24 weeks, then a fresh-start check. |
| Guidance | Step cards, timers, simple direction diagrams and voice guidance (on by default, one-tap mute). Video later. |
| Scans | Up to 6 per programme: 3 scheduled (start, middle, end), 3 earned. |
| Platform | Web app only for now. Sleep and water are logged by hand. |
| Water default when sex is "other" or "prefer not to say" | 1.6 L of drinks a day, editable. |

## 3. Evidence base and how we talk about it

| Area | What the evidence shows | What the app may say |
|---|---|---|
| Daily sunscreen, enough of it | Labels assume 2 mg/cm²; people typically apply a quarter to a half of that, which can cut SPF 50 to about SPF 20. | Strong, specific guidance ("two layers"). |
| Ramping up retinoids and acids | Standard practice: start every 2nd or 3rd night, step up as tolerated, pause and restart a step lower after irritation. A convention, not a trial-derived protocol. | "Introduced slowly so your skin can adjust." |
| Face workout | One 20-week study: fuller cheeks, perceived age about 50.8 to 48.1; 16 of 27 women finished, no control group. A 2025 trial (34 women) found small contour gains for roller and gua sha; no sham. A small study found higher blood flow after rolling. | "May improve fullness and tone with regular practice." Never "lifts", "drains" or "detoxes". |
| Sleep | Poor sleepers showed more signs of skin ageing and slower barrier recovery (60 women, association, industry-funded). | "Sleep supports your skin's overnight recovery." |
| Water | Extra water improved skin hydration in a small study of young women. | "A small daily habit that supports skin hydration." |
| Mind and stress | Mixed. The best-controlled psoriasis trial found no skin benefit; wellbeing benefits are more consistent. | "For you", with skin as a soft side benefit. |
| Supplements | Collagen benefit largely disappears in independently funded trials; biotin can distort heart-attack lab tests. | Out of v1. |
| Comedogenic ratings | Based mainly on rabbit-ear tests of undiluted ingredients; unreliable for finished products. | Not used. |
| Habit formation | Median about 66 days to automaticity, range 18 to 254. | Short programmes are called "starters". |

Sources are listed in section 22.

## 4. Scope

**Version 1**
- Intake ("comfort menu"), custom-length programme, daily session composer.
- Guided routine player: step cards, timers, direction diagrams, voice.
- Face workout library (text, timers, diagrams), progressive by block.
- Water log and smart reminders; sleep log and wind-down.
- Mirror check, free progress photos, scans (3 scheduled, 3 earned), skin-state trends.
- Bring-your-own product check: label photo, pasted ingredients, barcode.
- Per-person adaptation: tolerance, adherence, preferences, checkpoints.
- LLM: explanations, free-text logging, coach answers, weekly summary, label reading.

**Later**
- Mind and bedtime-yoga content, product-link import, video, native app with health-data sync, cross-user learning, supplements with expert review.

**Out of scope**
- Diagnosis, prescription treatments, medical claims.

## 5. User journey

1. **Intake** (about 3 minutes): goals, skin, safety questions, comfort menu, time, schedule, products owned.
2. **Programme preview:** length, blocks, what each block does, what to expect and when. First scan (baseline).
3. **Daily:** morning and evening sessions in the guided player; one-tap mirror check; water taps; sleep entry each morning.
4. **Weekly:** check-in (sleep, stress, time outside), progress photo, weekly summary from Kin.
5. **Checkpoints** (end of each block): self-ratings, scheduled scan when due, plan decision explained.
6. **Earned scans:** "You've felt better 5 of the last 7 days. Want to measure it?"
7. **End of programme:** before and after report, "continue" builds the next programme from what worked.

## 6. Intake: the comfort menu

| Group | Questions |
|---|---|
| Goals | Up to 3 concerns, ranked, each rated 1 to 5 (existing). |
| Skin | Type, sensitivity, sun reaction (phototype), current products and actives (existing). |
| Safety | Pregnancy or trying, "has a doctor told you to limit fluids?", known allergies, prescription skin treatment now (if yes: we keep to basics and advise following their doctor). |
| Pillars | Which to include: routine, face workout, water, sleep, mind. |
| Time | Minutes a day: 3, 5, 10 or 15; split morning and evening. |
| Schedule | Wake and bed times, preferred routine times, quiet hours. |
| Tools | Face roller, gua sha, none. |
| Products | Products owned (via product check); budget level for gap recommendations. |
| Dislikes | Things they do not want (e.g. no face exercises in the morning, no fragrance). |
| Voice | On by default; can mute. |

Everything here becomes a constraint or a weight. A pillar the person turns off never appears.

## 7. Programme model

A programme is a chain of 2-week blocks. Phases scale with length:

| Length | Blocks | Phases |
|---|---|---|
| 2 weeks | 1 | Foundation only (no new actives) |
| 4 weeks | 2 | Foundation, Build (one active at most) |
| 8 weeks | 4 | Foundation, Build, Build, Target |
| 12 weeks | 6 | Foundation, Build, Build, Target, Target, Maintain |
| Custom up to 24 | n | Foundation (1 block), then Build, Target, Maintain in proportion; a deload block may be inserted |

- **Foundation:** barrier and habit. Core routine, sunscreen technique, easy workouts.
- **Build:** actives introduced one at a time through their ladders; workouts progress (more reps, longer holds, new moves).
- **Target:** focus on the weakest concern; next ingredient on its ladder if the checkpoint allows.
- **Maintain:** keep what works, fewer changes, lighter sessions.
- **Deload:** inserted after repeated reactions or a stall with good adherence; barrier-only, light workouts.

**Scan schedule:** start and end are always scheduled; a middle scan from 8 weeks; earned scans scale with length; never more than 6 per programme, never within 10 days of the last one.

## 8. Knowledge base

The knowledge moves out of code into versioned data. Every plan records the knowledge version that built it.

| Entity | Fields |
|---|---|
| Ingredient | id, class, targets (concern to evidence grade A/B/C), irritation risk, time of day, ladder id, contraindications, conflicts, sources |
| Ladder | ordered rungs, each a frequency (e.g. 1 night/week, then every 3rd night, then every other night), minimum days on a rung, step-down rule |
| Routine step template | type (cleanse, treat, moisturise, protect), slot, instructions, timer, diagram id, voice script, minutes |
| Exercise | id, target area, difficulty, reps or hold, instructions, diagram id, contraindications (e.g. not on irritated or active-acne skin, no gua sha on inflamed skin) |
| Habit | water, sleep window, wind-down; targets and safety gates |
| Wellbeing action | breathing, stretch, gratitude; minutes; claim level "wellbeing" |
| Conflict | pair or group that must not share a night (e.g. retinoid and strong acid) |
| Contraindication | condition to blocked classes (pregnancy: retinoids, strong acids; sensitive: strong acids, retinoids; fluid restriction: water target) |
| Red flag | phrases and answers that stop coaching and advise a doctor |
| Source | citation, link, evidence grade, note |

The current safety lists (deny-list, allow-list for cautious profiles) move into this store unchanged in behaviour, with their existing tests.

## 9. The plan engine

The engine is a pipeline of pure functions:

1. **Person model:** the normalised profile (existing classification, extended with intake fields), plus the live state from section 11 (tolerance, adherence, preferences, readiness, skin state).
2. **Candidates:** from the knowledge base, every item that targets the person's concerns or pillars.
3. **Hard constraints:** contraindications, safety lists, conflicts, dislikes, tools available, pillars off. Anything that fails is removed.
4. **Scoring:** each candidate gets a score:
   - evidence for the concern (A > B > C) × concern priority and gap
   - × fit (skin type, phototype, sensitivity)
   - × tolerance estimate for its class (section 11)
   - × owned-product bonus (use what they have first)
   - ÷ time cost
   Weights live in the knowledge base so they can be tuned without code.
5. **Selection under limits:** daily minutes, active load (strong actives in use at once: 1 for sensitive or new users, 2 otherwise), spacing between new actives (14 days by default; 21 after a reaction; 10 for a tolerant, consistent user), at most one new item per pillar per block.
6. **Scheduling:** places items on the block calendar: which nights for each active (spaced 48 to 72 hours), conflicts never on the same night, recovery nights, rung frequency from the ladder, workout progression per block.
7. **Explanation trace:** each placed item stores the facts that put it there (concern, evidence grade, rung, rule). The LLM turns this into plain words.

The output is a **programme**: items with schedules, not a list of steps repeated every day.

## 10. Daily session composer

Each morning and evening it builds the session from the programme for that day:

1. **Readiness** (green, amber, red), with its reason:
   - red: irritation logged in the last 72 hours, or a red flag
   - amber: first week on a new rung, very poor sleep, high stress, very high UV, or a new product introduced
   - green: otherwise
2. **Apply readiness, only downward:** red skips actives and exfoliation (barrier-only) and swaps gua sha for gentle moves; amber holds the active at its current rung and shortens the workout.
3. **Fit the time budget:** core routine first (the habit anchor), then the scheduled active, then the workout, then one habit or wellbeing action.
4. **Rotate the workout** for variety inside the block's difficulty.
5. **Play it in the guided player:** step cards, timer, diagram, voice, auto-advance, "done" or "skip" on each step (skips are data).

The composer never adds an active the programme did not schedule.

## 11. Adaptation (the learning loop)

### Events
Every interaction is an event with a time and source: step done or skipped, session done, reaction (fine, tingled, irritated, breakout), mirror rating, water glass, sleep entry, weekly check-in, scan (with quality), progress photo, product added, chat message (parsed by the LLM, confirmed by the user when unsure).

### Per-person state
- **Tolerance** per ingredient class: a running estimate updated after each exposure (no reaction raises it, a reaction lowers it more). Frequency decisions use the cautious end of the estimate.
- **Adherence** per item and per slot (morning vs evening) and overall share of days.
- **Preferences:** skips and dislikes per exercise or habit.
- **Skin state** per concern: a smoothed estimate from mirror ratings, check-in ratings, quality-gated scans and photos, with uncertainty. Trend verdict: improving, steady, worsening, or not enough evidence. One scan never decides anything.
- **Readiness** (section 10).

### Rules (as data, tunable)

| Trigger | Change |
|---|---|
| Irritation logged on an active | Three barrier-only nights, then restart one rung lower; spacing for the next new active becomes 21 days. |
| Two reactions on the same class within a block | Pause that class for the block; offer a gentler alternative for the concern. |
| Two weeks on a rung, no reaction, at least 70% done | Move up one rung. |
| Under 50% done for two weeks | Shorten the session or drop the lowest-value item. Never add. |
| A step skipped often in one slot | Offer to move it (morning to evening) or make it shorter. |
| Exercise skipped or disliked often | Show it less; offer a variant for the same area. |
| Water target missed often at one hour | Move that reminder; or lower the target for a week to rebuild success. |
| Checkpoint: improving | Hold. |
| Checkpoint: steady, consistent | Next ingredient on that concern's ladder, if limits allow. |
| Checkpoint: steady, inconsistent | Simplify, no escalation. |
| Checkpoint: worsening with reactions | Deload block, or swap the active. |
| Checkpoint: not enough evidence | Extend, ask for ratings, offer the next scan when due. |
| Red flag (changing mole, severe or painful acne, spreading rash, reaction lasting over a week) | Stop changes, advise seeing a doctor, keep basics only. |

### Plan changes
Every rule produces a proposed change (a delta). Every delta, whether it comes from a rule or from the AI, passes the same hard constraints before it is applied, is versioned, and records its reason. The AI can propose, never write.

## 12. Progress measurement

- **Mirror check** (daily, one tap): "How does your skin look today?" Free and frequent, and subjective.
- **Progress photos** (weekly): guided framing and light check, stored privately, compared side by side. No YouCam cost.
- **Scans** (up to 6): 3 scheduled; 3 earned when mirror checks trend up (for example 5 of the last 7 days better than the person's baseline) and at least 10 days since the last scan. The scheduled scans keep the trend honest, because scanning only on good days would bias it upward.
- **Quality gate** (built in phase 4): poor photos are retaken for free; marginal ones are stored as low confidence and never treated as real change.
- **Report:** before and after, per concern, with the trend verdict and how sure we are.

## 13. Water and sleep

**Water**
- Default drinks target from EFSA total-water intake (2.0 L women, 2.5 L men, about 20 to 30% from food): about 1.6 L or 2.0 L of drinks; 1.6 L when sex is "other" or "prefer not to say". Always editable.
- A "limit fluids" answer at intake turns off the target and reminders; logging stays.
- One tap per glass, glass size set by the user.
- Reminders only in the wake window, outside quiet hours, only when behind pace, at most 4 a day, none once the target is met; ignored hours are dropped.
- iOS web push needs the app on the Home Screen (iOS 16.4+) and can be unreliable, so the Today screen also shows the nudge.

**Sleep**
- Morning entry: bedtime, wake time, how rested (one tap). The weekly check-in uses the same answers.
- Optional wind-down session (breathing, gentle stretch) at the chosen time.
- Poor sleep lowers readiness (section 10). It never adds products.

## 14. Bring-your-own product check

- **Inputs:** label photo (existing vision model), pasted ingredient list, barcode via Open Beauty Facts (licence to confirm), product link (later; many shops block automated reading, so paste is the fallback).
- **Processing:** parse the ingredient list, map each ingredient to its function (CosIng functions where available) and to our ingredient classes.
- **Match report:**
  - what it does, in plain words
  - fit with your goals and current plan
  - conflicts with your routine (for example a retinoid on your acid nights)
  - flags for your profile (retinoids if pregnant, fragrance and essential oils if sensitive)
  - where it would sit in your routine, if you add it
- **Wording:** "This is an ingredient-based match with your plan, not a recommendation or a safety assessment. Patch test new products." To be reviewed by a lawyer.
- No comedogenic scores.
- **Adding a product:** it fills the matching step and becomes an "owned product" for scoring. Patch-test prompt and a reaction check on the next three uses.

## 15. The LLM's role

| Role | Guardrails |
|---|---|
| Explain decisions | Only from the explanation trace; no new facts. |
| Free-text logging | Output must be a known event type; ask the user to confirm when unsure. |
| Coach answers | Grounded in the knowledge base; red-flag topics get the doctor message; no diagnosis. |
| Weekly summary | From events and state only. |
| Label reading | Ingredient list out; the matching is done by the engine, not the model. |
| Plan change requests ("fewer steps") | Becomes a proposed delta that passes the same constraints. |

Every response is checked against the safety lists before it is shown. Model calls have timeouts and a plain fallback so the app works without them.

## 16. Safety, claims and legal

- Hard gates: pregnancy and unsure, sensitivity, fluid restriction, prescription treatment, conflicts (all as data, all tested).
- Red flags stop coaching and advise a doctor.
- Claim language follows section 3.
- Before launch, a lawyer reviews the claims, the product-check wording and the terms.
- Health-adjacent data (sleep, mood, reactions) is consented, exportable and deletable; sensitive fields are encrypted at rest.
- A paid one-off review of the knowledge base by a dermatologist is recommended when budget allows.

## 17. Data model (new and changed)

| Collection | Purpose |
|---|---|
| knowledge (versioned) | ingredients, ladders, steps, exercises, habits, rules, sources |
| programme | person, knowledge version, length, blocks, items with schedules and rungs, scan plan, version, change history with reasons |
| event | append-only log of everything in section 11 |
| person state | tolerance, adherence, preferences, skin state, readiness (rebuildable from events) |
| product (owned) | parsed ingredients, classes, match report, step it fills |
| progress photo | private image, date, quality |
| existing | users, scans (with quality), lifestyle entries, reports |

Existing plans keep running unchanged. New programmes are created by the new engine behind a feature flag; at a plan's next renewal, the person moves to the new engine.

## 18. How we know it works

**Before release**
- Persona tests (extending the existing suite) for every rule.
- A simulation run: hundreds of synthetic users over 12 weeks with random reactions, skips and ratings. Invariants that must always hold:
  - never two strong actives on one night
  - never a step up within 14 days of a reaction
  - always inside the time budget and the safety rules
  - always one new active at a time

**After release**
- Product metrics:
  - sessions completed per week
  - 4- and 12-week retention
  - reaction rate per ingredient class
  - share of people whose trend is "improving" at checkpoints
  - time to first earned scan
  - water and sleep target hit rate
- Feature flags allow a holdout group for any new rule.

## 19. Learning across users

With a few dozen users, learning across people would only learn noise. The aim now is to collect data in a form that makes learning possible later, then switch each stage on when the numbers support it.

### Stage 0: collect the right data (now)
- **Decision log:** every engine choice is stored with its context, the alternatives it considered and rejected, and the rule or score that decided it. Without the alternatives, nothing can be learned later about what would have worked better.
- **Outcomes, frequent ones first:** session done, step skipped, reaction yes or no, 4-week retention. These arrive daily and are clean. Skin outcomes (ratings, scans) are slow and noisy and are used later.
- **Consent:** a separate, plain opt-in: "Use my anonymised data to improve plans for everyone." Off by default. Only consenting users' data is ever pooled.

### Stage 1: shared starting points (from a few hundred engaged users)
- New users' estimates (tolerance per ingredient class, adherence, likely response) start from people with a similar profile (sensitivity, skin type, phototype) instead of a fixed guess. Their own events quickly take over.
- Method: a hierarchical model (group averages first, each person's data pulls their own estimate). Standard and explainable.
- Example: "Sensitive skin starting azelaic acid: 18% reported irritation in the first 2 weeks", which makes the next sensitive user start one rung lower.

### Stage 2: safe experiments (from about a thousand users per question)
- Where two options are both allowed and equally safe (two actives for the same concern, two workout variants, two reminder times), the engine picks one at random and records the result.
- Over time it favours what works for similar people (Thompson sampling, a standard bandit method).
- Randomising is the only honest way to learn what causes improvement. Without it the data mostly shows that motivated users tick more and improve more.
- It never explores outside the allowed set. Hard rules always apply.

### Stage 3: "people like you" (with privacy floors)
- Insights such as "most people with your profile noticed a difference by week 6", shown only when the group has at least 50 people.
- Computed from aggregates, never from individual rows.

### Guardrails
- Learning only changes starting estimates, weights and the choice between allowed options. It can never unlock something the rules forbid.
- Every learned change is compared with a holdout group before rollout and can be switched off with a flag.
- Deleting an account removes the person's events and their contribution to future aggregates.

## 20. Platform and scale

### 20.1 How a scan works today and where it breaks
1. The photo goes through a server action to Cloudinary (the config allows 10 MB, but Vercel caps request bodies at 4.5 MB).
2. The scan action reserves a quota slot, sends the photo to YouCam and polls every second, up to 30 polls per attempt and up to 4 crop attempts (retries stop after 45 seconds).
3. It then asks the LLM for advice (45-second timeout, one retry), writes the scan and updates the plan.
4. The whole request must finish within 120 seconds (`maxDuration` on the capture route).

Confirmed vendor limits (from the providers' own pages, October 2026):

| Vendor | Limit | What it means for us |
|---|---|---|
| YouCam | 250 requests per 300 seconds per access token, and the same per IP address; recommended pacing about 5 requests a second; over the limit returns 429 Too Many Requests | About 50 requests a minute sustained for the whole app. Every create and every status check counts, and What-If simulations share the same budget. |
| LLM (DashScope) | 1M tokens per minute; 1M context; up to 393K output | One advice call is roughly 3K tokens, so about 300 calls a minute fit. Not the bottleneck. Requests-per-minute limit not shown; to confirm. |

Risks at 200 to 300 active users:
- **YouCam is the hard ceiling.** Today a scan makes 1 create request plus one status check every second until the result is ready (and up to 4 attempts with different crops). If a scan takes about 7 seconds, that is about 8 requests, so the whole app can finish only about 6 scans a minute. Anything faster gets 429 errors.
- **Today a burst fails instead of waiting.** There is no app-wide limiter. A 429 from YouCam is treated as a failed scan, so in a burst most people see an error (their allowance is refunded by the existing rollback, unless the request times out first).
- **Per-IP limit:** our server functions do not have fixed outgoing IP addresses, so the per-IP limit may apply unpredictably. The per-token limit is the one we plan around.
- **Timeouts with no clean-up:** in the worst case (slow YouCam, LLM retry) a scan can pass 120 seconds. If the platform stops the function, the existing rollback code never runs: the scan slot stays used and the uploaded photo stays orphaned.
- **Database connections:** 10 connections per server instance; many instances under load can exceed the database plan's connection limit.
- **Repeated loads per page** (audit item S1) multiply database load from every active user, not only from scans.
- **Every page is dynamic** (audit S5), so even marketing pages cannot be served from the CDN cache during a launch spike.

### 20.2 Target design for scans: queued, not held open
1. **Direct upload:** the phone uploads the photo straight to Cloudinary with a signed URL (the signing code exists), checked on the phone first (phase 4). No large request bodies through our server.
2. **Create a scan job:** a small request reserves the quota slot and stores a pending job. It returns at once with the job id.
3. **Worker with a YouCam request budget:** a background worker takes jobs from the queue and spends from one shared budget of YouCam requests (a token bucket set to about 230 requests per 300 seconds and at most 4 a second, leaving headroom below the limit). Every create and status check draws from it, including What-If simulations. On a 429 the worker backs off and retries instead of failing. A separate limit covers the LLM. Each job is safe to retry, and a timed-out job releases its slot and is retried or refunded.
4. **Fewer requests per scan:**
   - wait about 4 seconds before the first status check, then check every 3 seconds (instead of every second)
   - one crop attempt in normal cases, because the phone already checks framing and light; extra crop attempts only after a face-not-found error
   - ask Perfect Corp whether a completion callback (webhook) exists; with one, a scan costs a single request
5. **Progress on screen:** the capture screen shows "Analysing, you're number 4, about 30 seconds", and a push or in-app notice when results are ready. Leaving the page does not lose the scan.
6. **Circuit breaker:** after repeated vendor errors, new jobs wait instead of failing, and users see an honest "busy, we'll notify you".

Queue options: a job collection in MongoDB worked by a scheduled worker (no new vendor), or Vercel Queues (managed, in public beta). The choice is made after the load test (section 20.6).

### 20.3 Capacity, in numbers

YouCam allows about 50 requests a minute. Scan throughput depends on how many requests one scan uses (estimates; real timings come from the test in 20.6):

| Requests per scan | Scans per minute | 300 scans at once: last person waits |
|---|---|---|
| About 8 (today: check every second) | About 6 | About 50 minutes |
| About 4 (first check at 4 s, then every 3 s, one attempt) | About 12 | About 25 minutes |
| 1 (completion callback, if YouCam offers it) | About 50 | About 6 minutes |
| About 4, with the limit raised 5x by Perfect Corp | About 60 | About 5 minutes |

What this means:
- Normal use is fine. People browsing and ticking do not touch YouCam. If 300 people each scan once over an hour, that is 5 scans a minute, inside today's budget once the queue exists.
- A burst is the problem. A push or launch post that makes everyone scan at once cannot be served quickly on the standard limit, whatever we build. So:
  - scheduled-scan reminders are spread over the day (by user, not all at 9am)
  - the app never sends a "scan now" push to everyone at once
  - the queue shows an honest wait and notifies people when results are ready
  - before launch, ask Perfect Corp for a higher limit and whether a callback exists
- Database: 300 active users is about 50 to 150 requests a second at peak after the S1 fixes. The LLM (1M tokens a minute) is not a constraint at this scale.

### 20.4 Fixes before launch (from the scalability audit)

| Audit item | Problem | Fix |
|---|---|---|
| S1 | The user is loaded several times per page; Kin reloads on every route change | One cached lookup per request, only the fields needed, throttled Kin refresh |
| S2 | Reminders loop over every user one by one; water reminders add more | Queue one small job per user, batched by time zone |
| S3 | Leaderboard scans the users collection | Indexes, and cache each board for 5 to 10 minutes |
| S4 | Password hashing blocks the server during sign-in bursts | Native hashing library |
| S5 | Every page is dynamic because of the security nonce | Static marketing pages with hash-based security headers |
| S6 | Photos pass through a server action (4.5 MB platform cap) | Direct signed upload (20.2) |
| S7 | No global limit or breaker on YouCam and the LLM | Queue with concurrency limits and circuit breaker (20.2) |
| S8 | Rate-limit index not unique | Make it unique |
| S9 | Connection pool per instance can exceed the database limit | Size the database plan for it; consider 5 per instance; watch connections |
| S10 | Leaderboard and percentile errors are swallowed | Report to Sentry |
| S11 | No spend caps or alerts | Budget alerts on YouCam, the LLM and hosting |

### 20.5 New platform pieces for this design
- **Event log:** one write-optimised collection indexed by user and time. Raw events kept 12 months, then summaries. Person state is updated as events arrive and can be rebuilt from the log.
- **Background jobs:** reminders, scan processing, nightly recomputes and weekly summaries run in queued jobs, not in user requests.
- **Knowledge base in memory:** loaded once per version and cached, since every plan decision reads it.
- **Cost metering:** YouCam credits and LLM tokens per account, an alert when a tier loses money, and a warning before credits run out.
- **Vendor interfaces:** YouCam and the LLM each behind one interface with timeouts and fallbacks, so another provider can be added without touching the app.
- **Feature flags and a staging environment:** new rules reach a slice of users first.
- **Observability:** Sentry for errors, plus business metrics (sessions, reactions, scan success rate, queue wait, cost per user), alerts on spikes, and one dashboard.
- **Privacy at scale:** deletion covers events, photos, products and learned data; a retention policy for raw events.

### 20.6 How we prove it before launch
1. Vendor limits: YouCam confirmed (250 requests per 300 seconds per token and per IP). LLM tokens per minute confirmed (1M). Still to ask: a higher YouCam limit or a completion callback, and the LLM requests-per-minute limit.
2. Load test on a staging copy with YouCam and the LLM replaced by stubs that wait a realistic time and enforce the same 250-per-300-seconds limit, so 429 handling is tested too (no credits spent): ramp to 300 virtual users mixing browsing, ticking and scanning, then a burst of 300 scans in one minute.
3. Pass criteria: no failed scans (only queued ones), no 429 errors reaching YouCam's limit, queue wait shown and accurate, page responses under 1 second at the 95th percentile, database connections below 70% of the plan limit, no new errors in Sentry.
4. One short real-vendor test (about 20 scans, about 180 credits) to confirm real timings.
5. Decide the queue option (MongoDB job collection or Vercel Queues) from the results.

## 21. Build order

1. **Foundations:**
   - knowledge base and programme model (existing rules moved into data with identical behaviour, ladders, 2-week blocks, custom length)
   - decision log and the learning consent (section 19, stage 0)
   - queued scans with direct upload, the shared YouCam request budget, slower status checks and 429 back-off (section 20.2), and the audit fixes S1, S2, S6 and S7
2. **Events and person state:** event log, tolerance, adherence, preferences, reaction taps.
3. **Daily session composer and guided player:** readiness, time budget, step cards, timers, diagrams, voice.
4. **Face workout library and water and sleep modules,** with reminders on the queue.
5. **Progress:** mirror check, progress photos, scan schedule (scheduled and earned), skin-state estimator, checkpoints.
6. **Product check:** label photo, paste, barcode, match report.
7. **LLM roles** (section 15), weekly summary.
8. **Launch readiness:** remaining audit items (S3, S4, S5, S8 to S11), load test (section 20.6), legal review, metrics dashboard, cost metering.
9. **Learning stages 1 to 3** (section 19), each switched on when user numbers support it.

## 22. Sources

- Facial exercise (Alam et al., JAMA Dermatology 2018): https://www.sciencedaily.com/releases/2018/01/180103160142.htm
- Roller vs gua sha trial (2025): https://www.dermatologytimes.com/at-home-facial-massage-methods-clinically-proven-to-improve-skin-elasticity-tone-and-contour
- Roller and blood flow (Tokyo Tech 2018): https://www.titech.ac.jp/english/news/2018/042900
- Sleep and skin (Oyetakin-White et al.): https://academic.oup.com/ced/article/40/1/17/6621145
- Water and skin hydration (Palma et al. 2015): https://www.dovepress.com/dietary-water-affects-human-skin-hydration-and-biomechanics-peer-reviewed-fulltext-article-CCID
- Mindfulness in psoriasis (randomised trial): https://medicaljournalssweden.se/actadv/article/view/18277
- Collagen and funding (2025 meta-analysis coverage): https://nutraingredients.com/Article/2025/08/26/industry-reacts-to-meta-analysis-concluding-collagen-supplements-show-no-proven-benefit-for-skin-aging
- Biotin and lab tests (FDA): https://www.tctmd.com/news/biotin-supplements-can-interfere-cardiac-troponin-tests-fda
- Sunscreen amount: https://www.livescience.com/63152-sunscreen-protection-application.html
- Retinoid introduction (dermatology handout): https://my.officite.com/0042463/articles/general/920422-how-to-use-topical-retinoids
- Comedogenic ratings: https://labmuffin.com/fact-check-how-to-use-comedogenicity-ratings/
- Habit formation (Lally et al.): https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit
- Adaptive interventions (Nahum-Shani et al.): https://pmc.ncbi.nlm.nih.gov/articles/PMC5364076
- Water intake reference values (EFSA): https://pmc.ncbi.nlm.nih.gov/articles/4472938/
- iOS web push: https://documentation.onesignal.com/docs/web-push-for-ios
- Vercel request body limit: https://vercel.com/docs/functions/limitations#request-body-size
- CosIng ingredient inventory: https://ec.europa.eu/growth/tools-databases/cosing/assets/images/CosIng_FO.pdf
- Open Beauty Facts: https://f-droid.org/packages/openfoodfacts.github.scrachx.openbeauty/
- YouCam skin analysis: https://yce.perfectcorp.com/ai-api/products/skin-analysis-api
- YouCam rate limits and LLM limits: provider documentation screenshots shared by the product owner, October 2026

## 23. Design rating

This is a judgement of the design on paper, not of a built or tested product.

| Dimension | Score /10 | Why |
|---|---|---|
| Safety architecture | 8 | Hard gates, cautious defaults, one rule path for AI and rules, red flags. Missing: expert sign-off. |
| Personalisation and adaptivity | 8 | Constraint and scoring pipeline, ladders, readiness, per-person learning. Unproven until it runs. |
| Evidence discipline | 8.5 | Claims tied to evidence strength; weak areas framed honestly; supplements held back. |
| Progress measurement | 6.5 | Mirror, photos and quality-gated scans are a sound mix; only 6 scans and no validation study. |
| Guidance experience | 5 | Text, timers, diagrams and voice work, but leading apps use video. |
| Clinical governance | 3.5 | No advisor; mitigated by narrow claims and structure, not solved. |
| Learning flywheel | 4 | Per-person only at first. With section 19 in place, about 7 once user numbers allow. |
| Platform and scale readiness | 5.5 | Open audit items today. With section 20 done, about 7.5; a native app later adds the rest. |
| Differentiation | 7.5 | A workout-style adaptive programme with a plan-aware product check is uncommon. |
| **Overall** | **6.5** | A credible, above-average consumer wellness design. Not yet leader-grade. |

**What would raise it most**
1. A dermatologist review of the knowledge base (governance 3.5 to about 7).
2. Video or animation for the workout and routine player (guidance 5 to about 8).
3. A small before-and-after study with our own users, with honest reporting (measurement 6.5 to about 8).
4. Fixing the scalability items and adding a native app later (platform 5.5 to about 7.5).
5. Cross-user learning once there are enough consenting users (flywheel 4 to about 7).
