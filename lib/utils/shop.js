import "server-only";
import { createProducts, updateProducts } from "@polar-sh/sdk/2026-10/services/products";
import { connectDb, CreditPack, ShopSettings } from "@/app/lib/mongoose";
import { getPolarClient } from "./polar";
import {
  DEFAULT_PRICE_PER_CREDIT_CENTS,
  DEFAULT_MIN_CUSTOM_CREDITS,
  DEFAULT_MAX_CUSTOM_CREDITS,
} from "@/lib/constants/credits";

/**
 * Fetches the singleton shop settings doc, seeding it with defaults on
 * first use. Never talks to Polar itself — the custom-purchase product is
 * only created/updated explicitly, from adminUpdateShopSettings.
 */
export async function getOrCreateShopSettings() {
  await connectDb();
  let settings = await ShopSettings.findById("singleton");
  if (!settings) {
    settings = await ShopSettings.create({
      _id: "singleton",
      pricePerCreditCents: DEFAULT_PRICE_PER_CREDIT_CENTS,
      minCustomCredits: DEFAULT_MIN_CUSTOM_CREDITS,
      maxCustomCredits: DEFAULT_MAX_CUSTOM_CREDITS,
    });
  }
  return settings;
}

/**
 * Figures out how many credits a paid, non-subscription order should grant.
 * Shared by the billing webhook (to credit the purchase) and the admin
 * refund flow (to know how much to claw back). Returns null for an order
 * that isn't a shop purchase (e.g. a stale product id from a fully-removed
 * pack, or a subscription order).
 * @param {{ subscription_id: string|null, product_id: string|null, units: number|null }} order
 */
export async function resolveCreditGrant(order) {
  if (order.subscription_id) return null;
  await connectDb();

  /** @type {any} */
  const settings = await ShopSettings.findById("singleton").lean();
  if (settings?.customProductPolarId && order.product_id === settings.customProductPolarId) {
    return { credits: order.units || 0, packId: null };
  }

  /** @type {any} */
  const pack = await CreditPack.findOne({ polarProductId: order.product_id }).lean();
  if (pack) return { credits: pack.credits, packId: pack._id.toString() };

  return null;
}

/**
 * Creates the one-time, fixed-price Polar product backing a credit pack.
 * @param {{ label: string, description: string, priceCents: number }} pack
 */
export async function createPolarPackProduct({ label, description, priceCents }) {
  const polar = getPolarClient();
  const product = await createProducts(polar)({
    name: label,
    description: description || undefined,
    prices: [{ amount_type: "fixed", price_currency: "usd", price_amount: priceCents }],
  });
  return product.id;
}

/**
 * Updates an existing pack's Polar product name/description/price.
 * @param {string} productId
 * @param {{ label: string, description: string, priceCents: number }} pack
 */
export async function updatePolarPackProduct(productId, { label, description, priceCents }) {
  const polar = getPolarClient();
  await updateProducts(polar)(productId, {
    name: label,
    description: description || undefined,
    prices: [{ amount_type: "fixed", price_currency: "usd", price_amount: priceCents }],
  });
}

/**
 * Archives (never deletes) a Polar product so past orders stay resolvable.
 * @param {string} productId
 */
export async function archivePolarProduct(productId) {
  const polar = getPolarClient();
  await updateProducts(polar)(productId, { is_archived: true });
}

/**
 * Reverses archivePolarProduct when an admin reactivates a removed pack.
 * @param {string} productId
 */
export async function unarchivePolarProduct(productId) {
  const polar = getPolarClient();
  await updateProducts(polar)(productId, { is_archived: false });
}

/**
 * Creates or re-prices the single unit-based Polar product that every
 * custom-amount purchase checks out against (checkout passes `units` to
 * charge pricePerCreditCents * units). A flat, unbounded "volume" tier acts
 * as a simple per-unit price.
 * @param {string|null} existingProductId
 * @param {number} pricePerCreditCents
 */
export async function syncPolarCustomProduct(existingProductId, pricePerCreditCents) {
  const polar = getPolarClient();
  const unitAmount = String(pricePerCreditCents);

  // Inlined directly into each call (rather than built once in a shared
  // `const prices = [...]`) so the literal string fields (`amount_type`,
  // `tiers.type`) stay contextually typed against Polar's discriminated
  // union instead of widening to `string` and failing to match any member.
  if (existingProductId) {
    await updateProducts(polar)(existingProductId, {
      prices: [
        {
          amount_type: "unit_based",
          price_currency: "usd",
          tiers: { type: "volume", tiers: [{ bound: null, unit_amount: unitAmount }] },
        },
      ],
    });
    return existingProductId;
  }

  const product = await createProducts(polar)({
    name: "Custom Credits",
    description: "Buy exactly the number of credits you need.",
    prices: [
      {
        amount_type: "unit_based",
        price_currency: "usd",
        tiers: { type: "volume", tiers: [{ bound: null, unit_amount: unitAmount }] },
      },
    ],
  });
  return product.id;
}
