"use server";

import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser, findSessionUser, SESSION_EXPIRED_PATH } from "@/app/lib/auth-server";
import { connectDb, ProductCheck, User } from "./mongoose";
import { checkRateLimit } from "./rate-limit";
import { findActivePlan } from "./plan";
import { readIngredientLabel } from "./qwen";
import { parseIngredients, checkProduct } from "@/lib/plan/product-check";
import { toPlainUser } from "@/lib/plan/engine";
import { getTierProductCheckLimit } from "@/lib/constants/quotas";
import { effectiveTier } from "./feature-flags";
import { getLocalMonthStart, normalizeTimezone } from "@/lib/utils/date";

const MAX_IMAGE_CHARS = 3_000_000;
const MIN_INGREDIENTS = 3;

async function getUser() {
  await connectDb();
  const decoded = await getAuthenticatedUser().catch(() => null);
  if (!decoded) redirect("/sign-in");
  const user = await findSessionUser(decoded);
  if (!user) redirect(SESSION_EXPIRED_PATH);
  if (!user.onboardingComplete) redirect("/onboarding");
  return user;
}

async function usage(user) {
  const limit = getTierProductCheckLimit(effectiveTier(user));
  if (limit == null) return { limit: null, used: null, left: null };
  const { monthStart } = getLocalMonthStart(normalizeTimezone(user.timezone));
  const used = await ProductCheck.countDocuments({ userId: user._id, createdAt: { $gte: monthStart } });
  return { limit, used, left: Math.max(0, limit - used) };
}

const view = (doc) => ({
  id: String(doc._id),
  name: doc.name || "",
  source: doc.source,
  ingredientCount: doc.ingredients?.length ?? 0,
  report: doc.report,
  createdAt: new Date(doc.createdAt).toISOString(),
});

export async function getProductChecks() {
  try {
    const user = await getUser();
    const [rows, quota] = await Promise.all([
      ProductCheck.find({ userId: user._id }).sort({ createdAt: -1 }).limit(8).lean(),
      usage(user),
    ]);
    return { success: true, checks: rows.map(view), quota };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "product-checks-list" } });
    return { success: false, checks: [], quota: null };
  }
}

export async function checkProductAction({ text = "", image = null, name = "" } = {}) {
  try {
    const user = await getUser();
    const rate = await checkRateLimit(user._id.toString(), "product_check", 6, 60000);
    if (!rate.allowed) return { success: false, error: `Too many checks at once. Please wait ${rate.retryAfter}s.` };

    const quota = await usage(user);
    if (quota.limit != null && quota.left <= 0) {
      return { success: false, error: `You've used your ${quota.limit} free product checks this month. Upgrade for unlimited checks.`, code: "LIMIT", quota };
    }

    let source = "paste";
    let raw = typeof text === "string" ? text.slice(0, 4000) : "";
    let productName = typeof name === "string" ? name.trim().slice(0, 120) : "";
    if (image) {
      if (typeof image !== "string" || image.length > MAX_IMAGE_CHARS) return { success: false, error: "That photo is too large. Try again a little further from the label." };
      source = "photo";
      const read = await readIngredientLabel(image).catch(() => null);
      if (!read) return { success: false, error: "We couldn't read that label right now. Try again, or paste the ingredients instead." };
      raw = read.ingredients;
      productName = productName || read.name;
    }

    const ingredients = parseIngredients(raw);
    if (ingredients.length < MIN_INGREDIENTS) {
      return {
        success: false,
        error: source === "photo"
          ? "We couldn't find an ingredient list in that photo. Get the full list in frame, in good light."
          : "Paste the full ingredient list, separated by commas.",
      };
    }

    const plan = await findActivePlan(user._id);
    const report = checkProduct(ingredients, toPlainUser(user), plan?.steps ?? []);
    const doc = await ProductCheck.create({ userId: user._id, name: productName, source, ingredients, report });
    await User.findByIdAndUpdate(user._id, { $addToSet: { badges: "ingredient_alchemist" } }).catch(() => {});

    return {
      success: true,
      check: view(doc.toObject()),
      quota: quota.limit == null ? quota : { ...quota, used: quota.used + 1, left: Math.max(0, quota.left - 1) },
    };
  } catch (err) {
    if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    Sentry.captureException(err, { tags: { scope: "product-check" } });
    return { success: false, error: "Something went wrong checking that product. Please try again." };
  }
}
