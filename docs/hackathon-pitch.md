# TintKin: your daily skin coach

## The problem
Skin apps give you a score, and then nothing happens. People scan once, see a number, and ask "what am I getting from just my face result?" Routines found online ignore your skin, your safety (pregnancy, sensitivity) and how your skin reacts in the first weeks. That is when most people quit or irritate their skin.

## What TintKin does
TintKin is a daily skin coach. It works like a workout programme for your skin:

1. **Measure the baseline with YouCam.** The YouCam Skin Analysis API scores wrinkles, firmness, spots, radiance and skin age from one selfie. Photo quality is checked on the phone first, so a dark or blurry photo is never billed or scored.
2. **Build a plan for this person.** A deterministic rules engine turns goals, skin type, phototype and safety answers into a staged plan. Barrier care comes first, then one new active at a time. Pregnancy, unsure answers and sensitive skin are hard safety gates.
3. **Coach every day.** Guided morning and evening sessions use step cards, timers and voice. Each active runs only on its scheduled nights and climbs a ladder: retinoids go from 1 to 4 nights a week, and acids from 1 to 3.
4. **Adapt to the skin's reaction.** After each session the person taps Fine, Tingled, Irritated or Breakout.
   - Irritation means three barrier-only days, then a restart one rung lower.
   - A second reaction to the same ingredient class swaps that step for a gentler one.
   - Stepping up needs 14 calm days and 70% of scheduled sessions done.
5. **Measure the progress honestly.** A one-tap mirror check each day. Feeling better on 5 of the last 7 days *earns* a scan, and YouCam then measures whether the change is real. Low-quality scans are marked and never counted as real change.
6. **Check products against the plan.** Paste an ingredient list or snap the label. The engine tells you:
   - what the product does
   - which of your goals it serves
   - whether it clashes with your plan (for example, a second strong active)
   - anything to avoid for your profile
7. **Preview with YouCam.** The YouCam Skin Simulation API shows the person's own photo after a year of the routine.

## How we use YouCam
| API | Where | Why it matters |
|---|---|---|
| Skin Analysis | Baseline, check-in and earned scans | The objective measure behind every progress claim |
| Skin Simulation | What-If simulator | Motivation: see the outcome before committing |

YouCam is the measuring instrument. The coach decides *when* measuring is worth it, which keeps both the cost and the noise down.

## Business model
Subscription. TintKin does not sell products, so its advice stays independent.

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | Adaptive plan, guided sessions, 2 scans, 3 product checks, 1 simulation a month |
| Standard | $8/mo | 6 scans, unlimited product checks, 3 simulations |
| Pro | $15/mo | 12 scans, unlimited product checks, 4 simulations, custom-product simulations |

**Unit economics.** These are YouCam list costs: a scan is 9 credits (about $0.43) and a simulation is 4 credits (about $0.19).

| Tier | Worst-case YouCam cost a month | Price | Margin before fees |
|---|---|---|---|
| Free | about $1.05 (2 scans and 1 simulation) | $0 | acquisition cost |
| Standard | about $3.15 | $8 | about 61% |
| Pro | about $5.92 | $15 | about 61% |

Daily coaching (sessions, reactions, mirror checks) costs nothing per use, because it is our own engine. Scans are scheduled or earned, never spammed. That keeps the worst case bounded, and typical use is lower.

**Growth loops**
- The earned-scan moment ("you've felt better, prove it")
- Shareable progress cards
- Product checks, which bring people back before every purchase

## Why it is defensible
- **A safety-first, deterministic engine.** The same inputs always give the same plan. Every rule is unit-tested, including a 12-week simulation with random reactions that checks the invariants: never two strong actives on one night, never a step-up within 14 days of a reaction, red days are barrier only.
- **AI only proposes.** Anything a model suggests passes the same safety rules before it reaches a plan. The product matching is done by the engine; the model only reads the label.
- **Claims match the evidence.** Strong guidance only where the evidence is strong (sunscreen, slow active ramps). Softer wording elsewhere.

## Roadmap
From `docs/skin-coach-design.md`:
1. Queued scans with a shared YouCam request budget and 429 back-off (back-off is already live).
2. Face workout library, water and sleep modules.
3. Programmes in 2-week blocks, from 2 to 24 weeks.
4. Learning across consenting users: shared starting points, then safe A/B choices between equally safe options.
5. A dermatologist review of the knowledge base, and a native app.

## 2-minute demo script
1. **0:00, landing page.** "Skincare that adapts to you."
2. **0:15, Today.** Tap the mirror check. Point out the earned-scan card: "5 of the last 7 days better".
3. **0:30, scan.** The quality check runs, YouCam scores the face and the plan updates.
4. **0:50, Plan.** The readiness card is green. The retinoid shows "2 nights a week". Tonight is a rest night, shown greyed out.
5. **1:05, Start evening session.** Voice reads each step and the timer runs. Tap Done, then "Irritated".
6. **1:25, back on Plan.** Readiness turns red: "Recovery day, barrier care only". The retinoid is paused and will restart one rung lower.
7. **1:40, Product check.** Paste a BHA serum's ingredients. It says: "Your plan already runs a retinoid … don't use them on the same night."
8. **1:55, Pricing.** Coaching is free, measuring is the subscription.
