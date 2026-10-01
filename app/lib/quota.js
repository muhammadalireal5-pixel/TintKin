import "server-only";
import mongoose from "mongoose";
import { connectDb, User } from "./mongoose";
import { getLocalDayKey, getLocalMonthKey } from "@/lib/utils/date";

/**
 * Atomically reserves one usage slot against a daily/monthly cap.
 *
 * The scan/simulation flow runs multi-second external AI calls between
 * "is the user under their limit" and "persist the resulting record", so a
 * plain countDocuments()-then-create() check has a race window: two
 * concurrent requests (a double-tap, two tabs) can both read "under limit"
 * before either write lands, letting a user exceed their plan's cap.
 *
 * This reserves the slot *before* the expensive work starts, inside a
 * transaction (Atlas clusters run as replica sets, so multi-document
 * transactions are available) so the read-and-increment is a single atomic
 * unit — MongoDB serializes concurrent transactions touching the same user
 * document and retries the loser, so only one of two racing requests can
 * ever observe "count + 1 <= limit" for the slot that pushes it to the cap.
 *
 * On failure, the caller must release the slot via releaseSlot so a failed
 * attempt doesn't permanently consume the user's quota.
 */
async function reserveSlot({ userId, field, dayKey, monthKey, dailyLimit, monthlyLimit }) {
  await connectDb();
  const session = await mongoose.startSession();
  let granted = false;
  let reason = null;

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).select(field).session(session);
      if (!user) {
        reason = "user_not_found";
        return;
      }

      const usage = user[field] || {};
      const dayCount = dayKey && usage.dayKey === dayKey ? usage.dayCount || 0 : 0;
      const monthCount = usage.monthKey === monthKey ? usage.monthCount || 0 : 0;

      if (dayKey && dailyLimit != null && dayCount + 1 > dailyLimit) {
        reason = "daily_limit";
        return;
      }
      if (monthlyLimit != null && monthCount + 1 > monthlyLimit) {
        reason = "monthly_limit";
        return;
      }

      const update = {
        [`${field}.monthKey`]: monthKey,
        [`${field}.monthCount`]: monthCount + 1,
      };
      if (dayKey) {
        update[`${field}.dayKey`] = dayKey;
        update[`${field}.dayCount`] = dayCount + 1;
      }

      await User.updateOne({ _id: userId }, { $set: update }).session(session);
      granted = true;
    });
  } catch (error) {
    console.error("[QUOTA] Reservation transaction failed, failing closed:", error);
    return { granted: false, reason: "error" };
  } finally {
    await session.endSession();
  }

  return { granted, reason };
}

/** Best-effort compensating release for a slot reserved but not consumed (the analysis/simulation failed after the reservation succeeded). Only decrements if the period hasn't rolled over since reservation. */
async function releaseSlot({ userId, field, dayKey, monthKey }) {
  try {
    await connectDb();
    const query = { _id: userId, [`${field}.monthKey`]: monthKey };
    const dec = { [`${field}.monthCount`]: -1 };
    if (dayKey) {
      query[`${field}.dayKey`] = dayKey;
      dec[`${field}.dayCount`] = -1;
    }
    await User.updateOne(query, { $inc: dec });
  } catch (error) {
    console.error("[QUOTA] Failed to release slot:", error);
  }
}

export async function reserveScanSlot(userId, timezone, dailyLimit, monthlyLimit) {
  const dayKey = getLocalDayKey(timezone);
  const monthKey = getLocalMonthKey(timezone);
  const result = await reserveSlot({ userId, field: "scanUsage", dayKey, monthKey, dailyLimit, monthlyLimit });
  return { ...result, dayKey, monthKey };
}

export async function releaseScanSlot(userId, dayKey, monthKey) {
  return releaseSlot({ userId, field: "scanUsage", dayKey, monthKey });
}

export async function reserveSimulationSlot(userId, timezone, monthlyLimit) {
  const monthKey = getLocalMonthKey(timezone);
  const result = await reserveSlot({ userId, field: "simUsage", dayKey: null, monthKey, dailyLimit: null, monthlyLimit });
  return { ...result, monthKey };
}

export async function releaseSimulationSlot(userId, monthKey) {
  return releaseSlot({ userId, field: "simUsage", dayKey: null, monthKey });
}
