import { Webhooks } from "@polar-sh/nextjs";
import { connectDb, User } from "@/app/lib/mongoose";
import { TIERS, ACTIVE_SUBSCRIPTION_TIERS, TIER_PRODUCT_IDS } from "@/lib/constants/tiers";
import { resolveCreditGrant } from "@/lib/utils/shop";

// Polar product id -> our internal tier (inverse of TIER_PRODUCT_IDS).
// Webhooks() already verifies the request's webhook-signature header against
// POLAR_WEBHOOK_SECRET before any of these handlers run (see
// node_modules/@polar-sh/adapter-utils).
const PRODUCT_TIERS = Object.fromEntries(
  Object.entries(TIER_PRODUCT_IDS).map(([tier, productId]) => [productId, tier])
);

// Shared by subscription and order events alike — both carry a `customer`
// object shaped { external_id, email }.
async function findUserForExternalCustomer(customer) {
  await connectDb();
  const externalId = customer?.external_id;
  if (externalId) {
    const user = await User.findById(externalId).catch(() => null);
    if (user) return user;
  }
  const email = customer?.email;
  return email ? User.findOne({ email: email.toLowerCase().trim() }) : null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,

  // New subscription, renewal, or a lapsed one coming back - all land here.
  onSubscriptionActive: async (payload) => {
    const subscription = payload.data;
    const tier = PRODUCT_TIERS[subscription.product_id];
    const user = tier ? await findUserForExternalCustomer(subscription.customer) : null;
    if (!user) return;

    user.tier = tier;
    user.isSubscribed = ACTIVE_SUBSCRIPTION_TIERS.includes(tier);
    user.currentPeriodEnd = new Date(subscription.current_period_end);
    // Needed to call updateSubscriptions(id, ...) for upgrade/downgrade
    // (changeSubscriptionTier) without an extra list-by-customer lookup.
    user.polarSubscriptionId = subscription.id;
    if (!user.subscribedAt) user.subscribedAt = new Date();
    await user.save();
  },

  // Fires when changeSubscriptionTier() (or the hosted customer portal)
  // moves a subscription to a different product. Mirrors onSubscriptionActive's
  // tier mapping — the action that triggers the change never writes `tier`
  // itself, this webhook is the single source of truth for it.
  onSubscriptionUpdated: async (payload) => {
    const subscription = payload.data;
    const tier = PRODUCT_TIERS[subscription.product_id];
    const user = tier ? await findUserForExternalCustomer(subscription.customer) : null;
    if (!user) return;

    user.tier = tier;
    user.isSubscribed = ACTIVE_SUBSCRIPTION_TIERS.includes(tier);
    user.currentPeriodEnd = new Date(subscription.current_period_end);
    await user.save();
  },

  // Scheduled to cancel at period end - access continues until then.
  onSubscriptionCanceled: async (payload) => {
    const subscription = payload.data;
    const user = await findUserForExternalCustomer(subscription.customer);
    if (!user) return;

    user.currentPeriodEnd = new Date(subscription.current_period_end);
    await user.save();
  },

  // Subscription is actually over (cancellation took effect, or payment
  // retries were exhausted) - access is revoked immediately.
  onSubscriptionRevoked: async (payload) => {
    const user = await findUserForExternalCustomer(payload.data.customer);
    if (!user) return;

    user.tier = TIERS.FREE;
    user.isSubscribed = false;
    await user.save();
  },

  // A one-time credit purchase — a fixed pack or a custom amount (both
  // managed from /admin/shop). Subscription renewal invoices also fire
  // order.paid; resolveCreditGrant returns null for those (and for any
  // order that isn't a shop purchase at all).
  onOrderPaid: async (payload) => {
    const order = payload.data;
    const grant = await resolveCreditGrant(order);
    if (!grant || !grant.credits) return;

    const user = await findUserForExternalCustomer(order.customer);
    if (!user) return;

    // Polar retries undelivered webhooks with the same order, so guard
    // against double-crediting: only apply if this order id isn't already
    // recorded (the filter and update run as one atomic operation).
    await User.updateOne(
      { _id: user._id, creditedOrderIds: { $ne: order.id } },
      { $inc: { creditBalance: grant.credits }, $push: { creditedOrderIds: order.id } }
    );
  },
});
