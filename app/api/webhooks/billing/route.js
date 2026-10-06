import { Webhooks } from "@polar-sh/nextjs";
import { connectDb, User } from "@/app/lib/mongoose";
import { TIERS, ACTIVE_SUBSCRIPTION_TIERS } from "@/lib/constants/tiers";

// Polar product id -> our internal tier. Webhooks() already verifies the
// request's webhook-signature header against POLAR_WEBHOOK_SECRET before any
// of these handlers run (see node_modules/@polar-sh/adapter-utils).
const PRODUCT_TIERS = {
  [process.env.POLAR_PRODUCT_ID_STANDARD]: TIERS.STANDARD,
  [process.env.POLAR_PRODUCT_ID_PREMIUM]: TIERS.PREMIUM,
};

async function findUserForSubscription(subscription) {
  await connectDb();
  const externalId = subscription.customer?.external_id;
  if (externalId) {
    const user = await User.findById(externalId).catch(() => null);
    if (user) return user;
  }
  const email = subscription.customer?.email;
  return email ? User.findOne({ email: email.toLowerCase().trim() }) : null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,

  // New subscription, renewal, or a lapsed one coming back - all land here.
  onSubscriptionActive: async (payload) => {
    const subscription = payload.data;
    const tier = PRODUCT_TIERS[subscription.product_id];
    const user = tier ? await findUserForSubscription(subscription) : null;
    if (!user) return;

    user.tier = tier;
    user.isSubscribed = ACTIVE_SUBSCRIPTION_TIERS.includes(tier);
    user.currentPeriodEnd = new Date(subscription.current_period_end);
    if (!user.subscribedAt) user.subscribedAt = new Date();
    await user.save();
  },

  // Scheduled to cancel at period end - access continues until then.
  onSubscriptionCanceled: async (payload) => {
    const subscription = payload.data;
    const user = await findUserForSubscription(subscription);
    if (!user) return;

    user.currentPeriodEnd = new Date(subscription.current_period_end);
    await user.save();
  },

  // Subscription is actually over (cancellation took effect, or payment
  // retries were exhausted) - access is revoked immediately.
  onSubscriptionRevoked: async (payload) => {
    const user = await findUserForSubscription(payload.data);
    if (!user) return;

    user.tier = TIERS.FREE;
    user.isSubscribed = false;
    await user.save();
  },
});
