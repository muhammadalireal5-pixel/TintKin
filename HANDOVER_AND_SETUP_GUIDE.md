# TintKin: Turnkey Handover & Deployment Guide

This document provides a comprehensive, step-by-step setup guide for clients, buyers, or engineering teams taking over the **TintKin** codebase.

---

## 1. System Architecture Overview

TintKin is built on a high-performance, serverless modern stack:
- **Frontend & Server Actions:** Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Database:** MongoDB Atlas (Mongoose ODM with serverless connection caching).
- **Authentication:** Firebase Auth (Client SDK) + Firebase Admin SDK (JWT verification).
- **Diagnostic Computer Vision:** Perfect Corp YouCam AI Skin Analysis & Simulation APIs.
- **Dermatological Reasoning & OCR:** Alibaba Cloud Qwen (`qwen-plus` for recommendations, `qwen-vl-max` for product bottle OCR).
- **Media Ingestion & Face Cropping:** Cloudinary (Dynamic face centering and auto-crop transforms).
- **Environmental Context:** Open-Meteo Weather API (Real-time local UV Index).
- **Admin Portal & 2FA:** Passwordless email OTP via Resend.

---

## 2. Prerequisites

- **Node.js:** v18.18+ or v20+ (or **Bun** v1.0+)
- **Git:** Standard Git client
- **Package Manager:** `npm`, `pnpm`, or `bun`

---

## 3. Step-by-Step Service Configuration

### Step 1: MongoDB Atlas
1. Create a free or dedicated cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user with Read/Write privileges.
3. Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere for serverless environments).
4. Copy your connection string into `.env.local`:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/tintkin?retryWrites=true&w=majority"
   ```

### Step 2: Firebase Authentication
1. Go to the [Firebase Console](https://console.firebase.google.com) and create a project.
2. In **Build -> Authentication**, enable **Email/Password** (and optionally Google OAuth).
3. In **Project Settings -> General -> Your apps**, register a Web App and copy the config:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="..."
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
   NEXT_PUBLIC_FIREBASE_APP_ID="..."
   ```
4. In **Project Settings -> Service accounts**, click **Generate new private key**. Open the downloaded JSON file and extract:
   ```env
   FIREBASE_PROJECT_ID="..."
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@...iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Step 3: Cloudinary (Face Detection & Storage)
1. Sign up for a free account at [Cloudinary](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the dashboard:
   ```env
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
   CLOUDINARY_API_KEY="..."
   CLOUDINARY_API_SECRET="..."
   ```
3. In Cloudinary **Settings -> Upload -> Upload presets**, ensure an unsigned preset named `ml_default` exists (or create one).

### Step 4: Perfect Corp YouCam AI API
1. Register for an API developer key at [Perfect Corp / YouCam AI](https://yce-api-01.makeupar.com).
2. Copy the Bearer API Key:
   ```env
   YOUCAM_API_KEY="sk-..."
   ```

### Step 5: Alibaba Cloud DashScope / Qwen
1. Create an account on [Alibaba Cloud Model Studio / DashScope](https://dashscope-intl.aliyuncs.com).
2. Generate an API Key:
   ```env
   QWEN_API_KEY="sk-..."
   QWEN_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
   QWEN_MODEL_NAME="qwen-plus"
   ```

### Step 6: Resend & Admin Portal
1. Create an account at [Resend](https://resend.com) and generate an API key.
2. Configure your admin credentials:
   ```env
   ADMIN_EMAIL="your-admin-email@domain.com"
   RESEND_API_KEY="re_..."
   ADMIN_SESSION_SECRET="generate-32-byte-hex-string-using-openssl-rand-hex-32"
   ```

### Step 7: Billing & Tiers
```env
PAYMENT_WEBHOOK_SECRET="generate-any-secure-random-token"
ENABLE_DEMO_TIER_SWITCHING="true"
```

---

## 4. Local Development

1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd skin
   npm install
   # or: bun install
   ```

2. Create `.env.local` by copying `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   *(Fill in your actual API keys from Section 3)*.

3. Run the development server:
   ```bash
   npm run dev
   # or: bun run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Production Deployment (Vercel)

TintKin is pre-configured for one-click deployment on Vercel:

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New -> Project** and import the repository.
3. Under **Environment Variables**, paste all keys from your configured `.env.local`.
4. Deploy!
   - Next.js App Router and Server Actions will automatically configure serverless functions.
   - For custom domains, configure DNS A/CNAME records in Vercel settings.

---

## 6. Accessing the Admin Ops Console

1. Navigate to `/admin/login`.
2. Enter the email address configured in `ADMIN_EMAIL`.
3. Check your email for a 6-digit one-time code sent via Resend.
4. Enter the code to enter `/admin`.
5. From the console, you can:
   - Search all registered users by name or email.
   - Filter users by status (Active, Inactive, Subscribed).
   - Change user tiers manually (`Free`, `Standard`, `Pro`).
   - Grant bonus scans (`adminAddExtraScans`) for customer support resolution.
   - View real-time platform telemetry (Total scans, simulations run, active users).

---

## 7. Connecting Payments

Refer to [`PAYMENT_INTEGRATION_GUIDE.md`](./PAYMENT_INTEGRATION_GUIDE.md) for full instructions on wiring **Polar.sh**, **Stripe**, or **Lemon Squeezy** to TintKin's universal billing webhook (`/api/webhooks/billing`).
