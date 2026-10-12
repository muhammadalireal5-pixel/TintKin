"use server";

import "server-only";
import * as Sentry from "@sentry/nextjs";
import webpush from "web-push";
import { connectDb, PushSubscription } from "./mongoose";
import { getAuthenticatedUser } from "./auth-server";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:muhammad0alire@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// A subscription the browser itself reports as gone (unsubscribed, cleared
// site data, uninstalled) — stop tracking it instead of retrying forever.
function isGoneError(err) {
  return err?.statusCode === 404 || err?.statusCode === 410;
}

export async function subscribeToPush(subscription) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, error: "Push notifications aren't configured." };
  }
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { success: false, error: "Invalid subscription." };
  }

  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDb();
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: decoded.uid,
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      },
      { upsert: true }
    );
    return { success: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "push-subscribe" } });
    return { success: false, error: "Could not save subscription." };
  }
}

export async function unsubscribeFromPush(endpoint) {
  if (!endpoint) return { success: false, error: "Invalid subscription." };

  try {
    await getAuthenticatedUser();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDb();
    await PushSubscription.deleteOne({ endpoint });
    return { success: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "push-unsubscribe" } });
    return { success: false, error: "Could not remove subscription." };
  }
}

export async function getPushSubscriptionStatus(endpoint) {
  if (!endpoint) return { subscribed: false };
  try {
    await getAuthenticatedUser();
    await connectDb();
    const sub = await PushSubscription.findOne({ endpoint }).select("_id");
    return { subscribed: Boolean(sub) };
  } catch {
    return { subscribed: false };
  }
}

// Sends a one-off test notification to every device the signed-in user has
// subscribed on. Not wired into any product flow — a manual "it works" check
// for the Settings toggle.
export async function sendTestNotification() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, error: "Push notifications aren't configured." };
  }

  let decoded;
  try {
    decoded = await getAuthenticatedUser();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDb();
    const subs = await PushSubscription.find({ userId: decoded.uid });
    if (subs.length === 0) {
      return { success: false, error: "No active subscription for this device yet." };
    }

    const payload = JSON.stringify({
      title: "TintKin",
      body: "Notifications are working — you'll hear from us here.",
      url: "/dashboard",
    });

    await Promise.all(
      subs.map((sub) =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload).catch(async (err) => {
          if (isGoneError(err)) {
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            throw err;
          }
        })
      )
    );
    return { success: true };
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "push-send-test" } });
    return { success: false, error: "Could not send notification." };
  }
}

/**
 * Sends a notification to every device a given user has subscribed on.
 * Server-side only helper for future use (e.g. "your analysis is ready") —
 * not called from anywhere yet. Silently no-ops if push isn't configured or
 * the user has no subscriptions.
 */
export async function sendPushNotificationToUser(userId, { title, body, url = "/" }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  await connectDb();
  const subs = await PushSubscription.find({ userId });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url });
  await Promise.all(
    subs.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload).catch(async (err) => {
        if (isGoneError(err)) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          Sentry.captureException(err, { tags: { scope: "push-send" } });
        }
      })
    )
  );
}
