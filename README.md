<div align="center">
  <h1>TintKin</h1>
  <p><strong>A daily AI-powered wellness journal unlocking the true potential of your skin.</strong></p>
  <p>
    <a href="https://tint-kin.vercel.app/">TintKin</a> | <a href="[Insert Video Demo Link Here]">Project Demonstration</a>
  </p>
</div>

<br />

> **Submission for the YouCam API Skin AI & Apparel VTO Hackathon**

---

## 💡 Inspiration
Skincare is universally overwhelming. Consumers are bombarded with countless products, conflicting advice, and clinical metrics that are hard to interpret. We realized there was a critical missing piece: a **personalized, mindful companion** that helps you understand, nurture, and visualize your skin’s health over time. 

TintKin was built to solve the confusion around daily skincare routines. Instead of guessing what works, TintKin empowers users to log their skin's mood, track real progress, and visually simulate how different lifestyle or product choices will impact their skin in the future.

## 🚀 What it does
TintKin is a comprehensive web application acting as your personal skin wellness journal. Core features include:

* **Dashboard Score Cards:** Instant, beautifully visualized metrics tracking hydration, wrinkles, firmness, spots, and radiance over time.
* **Face Aging Projections:** Utilizing AI to project your skin's trajectory based on your current routine and lifestyle logs.
* **"What-If" Simulations:** An interactive simulator allowing users to test out a new serum or sunscreen habit side-by-side to visually see the projected impact on their skin before they buy a product.
* **Personalized AI Regimens:** Context-aware product and habit recommendations tailored to your daily scan scores.
* **Admin Ops Console:** A secure, dedicated portal built to oversee platform operations, manage users, and monitor application activity. We added this to give our team full visibility into user engagement, subscription metrics, and overall database health without needing to directly query the production database.

> ![Admin Ops Console](/public/admin.png)

> ![Dashboard](/public/dashboard.png)

## 💻 How we built it
TintKin is built on a modern, highly performant full-stack architecture:

* **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript.
* **Backend & Storage:** Vercel for serverless execution, Cloudinary for secure and dynamic image processing, and MongoDB Atlas for structured user and historical data storage.
* **Authentication:** Auth.js (NextAuth v5) with email/password and Google sign-in, JWT sessions, and server-side session checks on every action. (The original hackathon build used Firebase Auth.)
* **AI & LLMs:** Qwen API for generating personalized, context-aware skincare advice and routines based on the metrics.

## 🌟 YouCam API Integration (The Core Engine)
The **YouCam AI Skin Analysis API** is the foundational engine of TintKin. We integrated it deeply into our capture and simulation workflows to provide clinical-grade accuracy directly to the consumer.

1. **Precision Scanning:** When a user uploads a daily selfie, the image is securely passed to the YouCam API. We extract the granular data (Wrinkles, Firmness, Age Spots, Radiance) and the overall Skin Age to populate our MongoDB models and update the user's historical charts.
2. **"What-If" Visualizations:** We leverage the YouCam Simulation API to power our standout feature. By calculating the difference between a user's current routine and a proposed "What-If" intervention (like adding SPF daily), we map those deltas to YouCam's simulation intensities. The API returns a highly realistic, visually altered image showing the user exactly how their skin will look if they stick to their new routine.

> ![What-If Simulation](/public/whatif.png)

## 🚧 Challenges we ran into
Building a complex, image-heavy AI app came with its hurdles. One of our primary technical challenges was handling the variability of the **YouCam API responses**. Depending on the scan results, the API returned either flat JSON objects or zipped files containing `score_info.json`. We had to build a robust, unified parsing utility capable of downloading, unzipping (using `fflate`), and standardizing the data on the fly.

Another challenge was adhering to the strict facial positioning requirements of the YouCam Simulation API. We had to implement dynamic, server-side face-cropping logic via Cloudinary transformations before sending images to YouCam to prevent simulation failures. Finally, securely bridging **Firebase Authentication** client sessions with Next.js Server Actions and our MongoDB database required careful cookie management and token verification.

## 🏆 Accomplishments we're proud of
* **Seamless Full-Stack Architecture:** We successfully bridged Firebase Auth, MongoDB, Next.js, and multiple AI APIs into a single, cohesive user experience on Vercel.
* **Robust Data Pipelines:** Engineering a resilient, multi-step image processing pipeline that seamlessly uploads to Cloudinary, dynamically crops, queries YouCam, and securely caches the results.
* **Clinical Accuracy Meets UI/UX:** Taking highly clinical JSON data from the YouCam API and transforming it into an empathetic, gorgeously designed, and easy-to-understand wellness journal.

## 🛠️ Development

**Prerequisites:** Node.js 22+, [Bun](https://bun.sh) 1.3 (the lockfile is `bun.lock`), a MongoDB Atlas cluster (a replica set — quota reservation uses transactions), and Cloudinary, YouCam, Qwen (DashScope) and Resend accounts.

```bash
bun install
cp .env.example .env.local   # then fill in the values; every variable is documented there
bun run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run test` | Unit/regression tests (Node's built-in test runner, no extra dependencies) |
| `bun run type-check` | `tsc` over `lib/` (needs `@types/node`, not currently installed) |

Tests live in `tests/`. `tests/setup/register.mjs` maps the `@/` import alias so tests load the real source files; external services (YouCam, Cloudinary) are mocked with a stubbed `fetch`.

**Deployment (Vercel):** set every variable from `.env.example` in the project settings. `NEXTAUTH_URL` must be the public URL (it builds password-reset links), and Google OAuth needs `<url>/api/auth/callback/google` as an authorized redirect URI. See `AUDIT.md` for open production risks and required manual actions.

## 🔮 What's next for TintKin
* **Community Challenges:** Allowing users to opt into anonymous, 30-day "Hydration" or "SPF" challenges, comparing their YouCam AI improvements against a global cohort.
* **Dermatologist Portal:** Building a clinician-facing dashboard where dermatologists can securely review a patient's historical YouCam scans to monitor treatment efficacy remotely.
* **Mobile App:** Porting the Next.js web application to React Native for native push notifications and daily check-in reminders.

---
