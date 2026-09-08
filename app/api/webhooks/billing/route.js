import { NextResponse } from "next/server";
import { connectDb, User } from "@/app/lib/mongoose";
import {
  TIERS,
  STANDARD_PACING,
  ALLOWED_USER_TIERS,
  ACTIVE_SUBSCRIPTION_TIERS,
} from "@/lib/constants/tiers";

/**
 * Universal Billing Webhook Endpoint for TintKin
 * 
 * Supports incoming webhooks from:
 * - Polar.sh (subscription.created, subscription.updated, subscription.canceled)
 * - Stripe (customer.subscription.created, customer.subscription.updated, customer.subscription.deleted)
 * - Lemon Squeezy (subscription_created, subscription_updated, subscription_cancelled)
 * - Paddle / Custom payment systems
 * 
 * Security: Requires 'x-webhook-secret' header matching PAYMENT_WEBHOOK_SECRET.
 */
export async function POST(req) {
  try {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    
    // Enforce secret validation
    const incomingSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!webhookSecret || incomingSecret !== webhookSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing webhook secret" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      userId, 
      email, 
      firebaseUid, 
      tier, 
      status = "active", 
      standardPlanFrequency = STANDARD_PACING.FLEXIBLE,
      currentPeriodEnd 
    } = body;

    if (!userId && !email && !firebaseUid) {
      return NextResponse.json(
        { success: false, error: "Missing identifier: provide userId, email, or firebaseUid" },
        { status: 400 }
      );
    }

    await connectDb();

    // Find the user by any provided identifier
    const query = {};
    if (userId) query._id = userId;
    else if (firebaseUid) query.firebaseUid = firebaseUid;
    else if (email) query.email = email.toLowerCase().trim();

    const user = await User.findOne(query);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Target user not found" },
        { status: 404 }
      );
    }

    // Determine tier and subscription status
    const isCanceled = status === "canceled" || status === "cancelled" || status === "inactive";
    const assignedTier = isCanceled ? TIERS.FREE : (tier || user.tier);

    if (!ALLOWED_USER_TIERS.includes(assignedTier)) {
      return NextResponse.json(
        { success: false, error: "Invalid tier. Must be 'free', 'standard', or 'premium'" },
        { status: 400 }
      );
    }

    user.tier = assignedTier;
    user.isSubscribed = ACTIVE_SUBSCRIPTION_TIERS.includes(assignedTier);

    if (assignedTier === TIERS.STANDARD && Object.values(STANDARD_PACING).includes(standardPlanFrequency)) {
      user.standardPlanFrequency = standardPlanFrequency;
    }

    if (currentPeriodEnd) {
      user.currentPeriodEnd = new Date(currentPeriodEnd);
    }

    if (user.isSubscribed && !user.subscribedAt) {
      user.subscribedAt = new Date();
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `User subscription updated to tier: ${assignedTier}`,
      user: {
        id: user._id.toString(),
        email: user.email,
        tier: user.tier,
        isSubscribed: user.isSubscribed,
        currentPeriodEnd: user.currentPeriodEnd
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error processing billing webhook" },
      { status: 500 }
    );
  }
}
