# TintKin: Modular Payment Integration Guide

TintKin is architected with a **decoupled, gateway-agnostic billing architecture**. Rather than hardcoding a single payment processor, TintKin provides a secure internal billing webhook endpoint:

```
POST /api/webhooks/billing
Header: x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>
```

This allows the platform owner to connect **Polar.sh**, **Stripe**, **Lemon Squeezy**, **Paddle**, or any custom merchant of record without modifying core app code.

---

## 1. Quick Testing (No Payment Provider Required)

You do **not** need an active payment account to test subscription upgrades:

### Method A: Local Demo Mode (Default)
In `.env.local` or hosting environment variables:
```env
ENABLE_DEMO_TIER_SWITCHING="true"
```
Users can navigate to `/pricing` and click **"Select Standard"** or **"Select Pro"** to immediately upgrade for testing and demo walkthroughs.

### Method B: Test Webhook via cURL
To simulate a payment provider's webhook event locally or on staging:

```bash
curl -X POST http://localhost:3000/api/webhooks/billing \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: tintkin_dev_webhook_secret_2026" \
  -d '{
    "email": "user@example.com",
    "tier": "premium",
    "status": "active",
    "currentPeriodEnd": "2026-12-31T23:59:59.000Z"
  }'
```

Expected Response (`200 OK`):
```json
{
  "success": true,
  "message": "User subscription updated to tier: premium",
  "user": {
    "id": "66b1...",
    "email": "user@example.com",
    "tier": "premium",
    "isSubscribed": true
  }
}
```

---

## 2. Option 1: Polar.sh (Recommended for Pakistan & Global Payouts)

**Why Polar.sh?**
[Polar.sh](https://polar.sh) is a modern developer-first Merchant of Record (MoR). Unlike Stripe (which does not natively support merchant accounts in Pakistan), **Polar supports global developer payouts** (via Payoneer, Wise, and bank transfers across 150+ countries including Pakistan).

### Step 1: Create Products in Polar
1. Sign in to your [Polar.sh Dashboard](https://polar.sh).
2. Create two recurring subscription products:
   - **Standard Plan:** $12/month (Set custom metadata: `{"tier": "standard"}`).
   - **Pro Plan:** $24/month (Set custom metadata: `{"tier": "premium"}`).

### Step 2: Configure Webhook in Polar
1. In the Polar Dashboard, go to **Settings -> Webhooks -> Add Webhook Endpoint**.
2. Set Endpoint URL to: `https://your-domain.com/api/webhooks/polar` (or use the forwarder below).
3. Subscribe to the following events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`

### Step 3: Add Polar Webhook Route in Next.js
Create `app/api/webhooks/polar/route.js`:

```javascript
import { NextResponse } from "next/server";
import { Webhook } from "@polar-sh/nextjs";

export async function POST(req) {
  const requestBody = await req.text();
  const signature = req.headers.get("webhook-signature");
  
  // 1. Verify Polar Signature (using POLAR_WEBHOOK_SECRET)
  // ... Or forward directly to TintKin's billing endpoint:
  const event = JSON.parse(requestBody);
  const data = event.data;

  const email = data.user?.email || data.customer?.email;
  const polarProduct = data.product?.name?.toLowerCase() || "";
  
  let tier = "standard";
  if (polarProduct.includes("pro") || polarProduct.includes("premium")) {
    tier = "premium";
  }

  const status = data.status === "active" ? "active" : "canceled";

  // Forward to TintKin internal billing API
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": process.env.PAYMENT_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      email,
      tier,
      status,
      currentPeriodEnd: data.current_period_end,
    }),
  });

  return NextResponse.json({ received: true });
}
```

---

## 3. Option 2: Stripe Integration

### Step 1: Create Stripe Products
1. In [Stripe Dashboard](https://dashboard.stripe.com), create:
   - Standard: $12.00 / month
   - Pro: $24.00 / month

### Step 2: Stripe Webhook Listener
Create `app/api/webhooks/stripe/route.js`:

```javascript
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_email || session.customer_details?.email;
    const tier = session.metadata?.tier || "standard";

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.PAYMENT_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ email, tier, status: "active" }),
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/billing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.PAYMENT_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ email: customer.email, status: "canceled" }),
    });
  }

  return NextResponse.json({ received: true });
}
```

---

## 4. Option 3: Lemon Squeezy

1. In the [Lemon Squeezy Dashboard](https://lemonsqueezy.com), create your monthly subscriptions.
2. In Webhooks, subscribe to `subscription_created`, `subscription_updated`, `subscription_cancelled`.
3. Read the payload `data.attributes.user_email` and forward to `/api/webhooks/billing`.

---

## 5. Going Live Checklist

When you or the client are ready to launch in production:
1. In your deployment environment (e.g. Vercel), set:
   ```env
   ENABLE_DEMO_TIER_SWITCHING="false"
   ```
2. Generate a high-entropy secret for:
   ```env
   PAYMENT_WEBHOOK_SECRET="<generate-random-secret>"
   ```
3. Set your checkout links on the `/pricing` client buttons to your Polar/Stripe checkout URLs.
