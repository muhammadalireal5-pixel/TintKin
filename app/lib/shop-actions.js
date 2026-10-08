"use server";

import "server-only";
import * as Sentry from "@sentry/nextjs";
import mongoose from "mongoose";
import { connectDb, CreditPack } from "./mongoose";
import { verifyAdminSession } from "./admin-auth";
import {
  getOrCreateShopSettings,
  createPolarPackProduct,
  updatePolarPackProduct,
  archivePolarProduct,
  unarchivePolarProduct,
  syncPolarCustomProduct,
} from "@/lib/utils/shop";

function serializePack(pack) {
  return {
    id: pack._id.toString(),
    label: pack.label,
    description: pack.description,
    credits: pack.credits,
    priceCents: pack.priceCents,
    polarProductId: pack.polarProductId,
    active: pack.active,
    sortOrder: pack.sortOrder,
  };
}

function serializeSettings(settings) {
  return {
    pricePerCreditCents: settings.pricePerCreditCents,
    minCustomCredits: settings.minCustomCredits,
    maxCustomCredits: settings.maxCustomCredits,
    customProductPolarId: settings.customProductPolarId,
  };
}

/**
 * Public, read-only catalog for the /shop page. No sign-in required — same
 * as /pricing, the price list itself isn't sensitive.
 */
export async function getShopCatalog() {
  try {
    await connectDb();
    const [packs, settings] = await Promise.all([
      CreditPack.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }),
      getOrCreateShopSettings(),
    ]);

    return {
      success: true,
      packs: packs.map(serializePack),
      pricePerCreditCents: settings.pricePerCreditCents,
      minCustomCredits: settings.minCustomCredits,
      maxCustomCredits: settings.maxCustomCredits,
      customPurchaseEnabled: Boolean(settings.customProductPolarId),
    };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "get-shop-catalog" } });
    return {
      success: false,
      error: "Failed to load the shop.",
      packs: [],
      pricePerCreditCents: 0,
      minCustomCredits: 0,
      maxCustomCredits: 0,
      customPurchaseEnabled: false,
    };
  }
}

/** Admin-only. Every pack (active and archived) plus the custom-purchase settings. */
export async function adminListShopItems() {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Please sign in again to continue." };

    await connectDb();
    const [packs, settings] = await Promise.all([
      CreditPack.find({}).sort({ sortOrder: 1, createdAt: 1 }),
      getOrCreateShopSettings(),
    ]);

    return { success: true, packs: packs.map(serializePack), settings: serializeSettings(settings) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-list-shop-items" } });
    return { success: false, error: "Failed to load shop items." };
  }
}

/** Admin-only. Creates a new credit pack and its backing Polar product. */
export async function adminCreatePack({ label, description, credits, priceCents, sortOrder } = {}) {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Please sign in again to continue." };

    const cleanLabel = typeof label === "string" ? label.trim().slice(0, 80) : "";
    const cleanDescription = typeof description === "string" ? description.trim().slice(0, 300) : "";
    const creditsNum = Number(credits);
    const priceCentsNum = Number(priceCents);

    if (!cleanLabel) return { success: false, error: "Label is required." };
    if (!Number.isInteger(creditsNum) || creditsNum < 1) {
      return { success: false, error: "Credits must be a positive whole number." };
    }
    if (!Number.isInteger(priceCentsNum) || priceCentsNum < 1) {
      return { success: false, error: "Price must be a positive amount." };
    }

    await connectDb();
    const polarProductId = await createPolarPackProduct({
      label: cleanLabel,
      description: cleanDescription,
      priceCents: priceCentsNum,
    });

    const pack = await CreditPack.create({
      label: cleanLabel,
      description: cleanDescription,
      credits: creditsNum,
      priceCents: priceCentsNum,
      polarProductId,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    return { success: true, pack: serializePack(pack) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-create-pack" } });
    return { success: false, error: "Failed to create pack." };
  }
}

/** Admin-only. Updates a pack's copy/price/credits, syncing Polar when needed. Active state is controlled by adminDeletePack/adminRestorePack. */
export async function adminUpdatePack(packId, updates = {}) {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Please sign in again to continue." };
    if (!packId || !mongoose.Types.ObjectId.isValid(packId)) {
      return { success: false, error: "Invalid pack ID" };
    }

    await connectDb();
    const pack = await CreditPack.findById(packId);
    if (!pack) return { success: false, error: "Pack not found." };

    const next = {
      label: typeof updates.label === "string" ? updates.label.trim().slice(0, 80) : pack.label,
      description: typeof updates.description === "string" ? updates.description.trim().slice(0, 300) : pack.description,
      credits: updates.credits !== undefined ? Number(updates.credits) : pack.credits,
      priceCents: updates.priceCents !== undefined ? Number(updates.priceCents) : pack.priceCents,
    };
    if (!next.label) return { success: false, error: "Label is required." };
    if (!Number.isInteger(next.credits) || next.credits < 1) {
      return { success: false, error: "Credits must be a positive whole number." };
    }
    if (!Number.isInteger(next.priceCents) || next.priceCents < 1) {
      return { success: false, error: "Price must be a positive amount." };
    }

    const polarCopyChanged = next.label !== pack.label || next.description !== pack.description || next.priceCents !== pack.priceCents;
    if (polarCopyChanged) {
      await updatePolarPackProduct(pack.polarProductId, next);
    }

    pack.label = next.label;
    pack.description = next.description;
    pack.credits = next.credits;
    pack.priceCents = next.priceCents;
    if (updates.sortOrder !== undefined && Number.isFinite(Number(updates.sortOrder))) {
      pack.sortOrder = Number(updates.sortOrder);
    }
    await pack.save();

    return { success: true, pack: serializePack(pack) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-update-pack" } });
    return { success: false, error: "Failed to update pack." };
  }
}

/**
 * Admin-only. Removes a pack from the shop. Archives the Polar product and
 * marks the pack inactive rather than deleting it — the webhook and refund
 * lookups still need to resolve credits for orders already placed against it.
 */
export async function adminDeletePack(packId) {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Please sign in again to continue." };
    if (!packId || !mongoose.Types.ObjectId.isValid(packId)) {
      return { success: false, error: "Invalid pack ID" };
    }

    await connectDb();
    const pack = await CreditPack.findById(packId);
    if (!pack) return { success: false, error: "Pack not found." };

    await archivePolarProduct(pack.polarProductId);
    pack.active = false;
    await pack.save();

    return { success: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-delete-pack" } });
    return { success: false, error: "Failed to remove pack." };
  }
}

/** Admin-only. Reverses adminDeletePack: unarchives the Polar product and puts the pack back on /shop. */
export async function adminRestorePack(packId) {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Please sign in again to continue." };
    if (!packId || !mongoose.Types.ObjectId.isValid(packId)) {
      return { success: false, error: "Invalid pack ID" };
    }

    await connectDb();
    const pack = await CreditPack.findById(packId);
    if (!pack) return { success: false, error: "Pack not found." };

    await unarchivePolarProduct(pack.polarProductId);
    pack.active = true;
    await pack.save();

    return { success: true, pack: serializePack(pack) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-restore-pack" } });
    return { success: false, error: "Failed to restore pack." };
  }
}

/**
 * Admin-only. Updates the per-credit price (and custom-amount bounds) used
 * for /shop's "Buy a custom amount" option. Creates the backing Polar
 * product on first save; re-prices it whenever the rate changes.
 */
export async function adminUpdateShopSettings(updates = {}) {
  try {
    const session = await verifyAdminSession();
    if (!session) return { success: false, error: "Please sign in again to continue." };

    const price = Number(updates.pricePerCreditCents);
    const min = Number(updates.minCustomCredits);
    const max = Number(updates.maxCustomCredits);

    if (!Number.isFinite(price) || price <= 0) {
      return { success: false, error: "Price per credit must be a positive number." };
    }
    if (!Number.isInteger(min) || min < 1) {
      return { success: false, error: "Minimum credits must be a positive whole number." };
    }
    if (!Number.isInteger(max) || max < min) {
      return { success: false, error: "Maximum credits must be a whole number no smaller than the minimum." };
    }

    const settings = await getOrCreateShopSettings();
    const needsPolarSync = price !== settings.pricePerCreditCents || !settings.customProductPolarId;
    const polarProductId = needsPolarSync
      ? await syncPolarCustomProduct(settings.customProductPolarId, price)
      : settings.customProductPolarId;

    settings.pricePerCreditCents = price;
    settings.minCustomCredits = min;
    settings.maxCustomCredits = max;
    settings.customProductPolarId = polarProductId;
    await settings.save();

    return { success: true, settings: serializeSettings(settings) };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "admin-update-shop-settings" } });
    return { success: false, error: "Failed to update shop settings." };
  }
}
