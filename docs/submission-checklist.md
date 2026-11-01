# TintKin submission checklist — November 1, 2026

Submission site: https://tint-kin.vercel.app/

Official rules: https://youcam-api-skin-ai-ecommerce.devpost.com/rules

Deadline: November 2, 2026, 11:45 am Eastern / 9:45 pm Pakistan time. Target completion remains November 1.

## Required submission assets

- A public 1–3 minute YouTube (preferred) or Vimeo demo, linked in Devpost. Show the working app and explain which YouCam APIs it uses. No demo URL has been supplied yet.
- A repository URL with source, assets and reproducible setup instructions. Ensure judges have access; follow the public/private repository requirements in the rules.
- An English description explaining consumer value. Describe simulations as illustrations, not guaranteed predictions.
- Keep the working app and free judge access available through November 20. Explain significant updates during the submission period if the project predates it.

## Release gates

- Run unit tests, lint, the production build and browser checks on the final commit.
- Deploy the tested commit. The live site observed November 1 still presented the older wellness-journal landing page.
- Configure `ADMIN_VIEWER_EMAIL` and `ADMIN_VIEWER_PASSWORD` to match the README. A live login attempt with the published credentials returned HTTP 401 on November 1. They are absent from local `.env.local` too. Never use the owner password for the public viewer.
- Verify `AUTH_URL`/`NEXTAUTH_URL`, OAuth callback URLs and vendor keys in Vercel; local key presence does not verify deployed configuration.
- Keep `ALL_PREMIUM` enabled for judging (the current code enables it unless explicitly set to `0`).
- Repair the `ratelimits` compound index. A read-only database inspection found `identifier_1_action_1_windowStart_1` without `unique: true`. Check duplicate buckets first; perform the migration in a controlled window, then verify uniqueness. No database index was dropped during this audit.
- Confirm the external hourly reminder scheduler and its bearer secret. Vercel Hobby supports only daily cron schedules: https://vercel.com/docs/cron-jobs/usage-and-pricing.
- Confirm vendor credits and budget alerts in YouCam, DashScope and Vercel.

## Browser checks

Run `bunx playwright install chromium` once, then `bun run test:e2e` after a production build. The suite starts `next start` on port 3100 by default. To use an existing server, set `E2E_BASE_URL` to its origin.

Set `E2E_EMAIL` and `E2E_PASSWORD` for a disposable, onboarded account to include authenticated screens, mirror persistence and Kin fallback checks. These tests write a mirror check; do not use a personal account. Without credentials those checks are explicitly skipped. Local browser artifacts, traces and temporary account credentials belong in ignored `test-results/`.

Final real-device checks:

1. Fresh sign-up → onboarding → plan → guided session → reaction → dashboard. Reload to verify persistence.
2. Allow camera on a phone over HTTPS; submit a consenting adult's well-lit, unfiltered selfie. Verify real YouCam analysis, quota handling, result display and history.
3. Run a What-If simulation from that photo. Verify loading, result, saving and deletion. Confirm sufficient YouCam credit before recording.
4. Paste a product ingredient list; verify the real Qwen result is saved and survives reload.
5. Sign out, sign back in, test the published viewer login, and repeat the main routes at phone and laptop widths on the deployed commit.

## Suggested 2:40 demo

- 0:00–0:20: The problem and TintKin's adaptive daily-coaching approach.
- 0:20–0:45: Profile and personalized plan; show safety answers affecting the plan.
- 0:45–1:15: A real YouCam scan, measurements and history. Explain YouCam's role.
- 1:15–1:45: Guided session and reaction logging; demonstrate how the plan responds.
- 1:45–2:10: Product compatibility and What-If illustration using the real integrations.
- 2:10–2:40: Progress, earned scan loop and consumer value. Show the app URL.

Use genuine recorded results. Do not present mocked responses, future features or untested integrations as completed live flows.
