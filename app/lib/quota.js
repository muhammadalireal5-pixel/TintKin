import "server-only";
import mongoose from "mongoose";
import { connectDb, User } from "./mongoose";
import { getLocalDayKey, getLocalMonthKey, normalizeTimezone } from "@/lib/utils/date";
import { resolvePeriod } from "@/lib/utils/quota-period";

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
  let effectiveDayKey = dayKey;
  let effectiveMonthKey = monthKey;

  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).select(field).session(session);
      if (!user) {
        reason = "user_not_found";
        return;
      }

      const usage = user[field] || {};
      const day = dayKey ? resolvePeriod(usage.dayKey, usage.dayCount, dayKey) : null;
      const month = resolvePeriod(usage.monthKey, usage.monthCount, monthKey);
      effectiveDayKey = day ? day.key : null;
      effectiveMonthKey = month.key;

      if (day && dailyLimit != null && day.count + 1 > dailyLimit) {
        reason = "daily_limit";
        return;
      }
      if (monthlyLimit != null && month.count + 1 > monthlyLimit) {
        reason = "monthly_limit";
        return;
      }

      const update = {
        [`${field}.monthKey`]: month.key,
        [`${field}.monthCount`]: month.count + 1,
      };
      if (day) {
        update[`${field}.dayKey`] = day.key;
        update[`${field}.dayCount`] = day.count + 1;
      }

      await User.updateOne({ _id: userId }, { $set: update }).session(session);
      granted = true;
    });
  } catch (error) {
    console.error("[QUOTA] Reservation transaction failed, failing closed:", error?.message || error);
    return { granted: false, reason: "error", dayKey, monthKey };
  } finally {
    await session.endSession();
  }

  // Callers release against the keys actually written, not the requested ones.
  return { granted, reason, dayKey: effectiveDayKey, monthKey: effectiveMonthKey };
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
  const tz = normalizeTimezone(timezone);
  const dayKey = getLocalDayKey(tz);
  const monthKey = getLocalMonthKey(tz);
  return reserveSlot({ userId, field: "scanUsage", dayKey, monthKey, dailyLimit, monthlyLimit });
}

export async function releaseScanSlot(userId, dayKey, monthKey) {
  return releaseSlot({ userId, field: "scanUsage", dayKey, monthKey });
}

export async function reserveSimulationSlot(userId, timezone, monthlyLimit) {
  const monthKey = getLocalMonthKey(normalizeTimezone(timezone));
  return reserveSlot({ userId, field: "simUsage", dayKey: null, monthKey, dailyLimit: null, monthlyLimit });
}

export async function releaseSimulationSlot(userId, monthKey) {
  return releaseSlot({ userId, field: "simUsage", dayKey: null, monthKey });
}
