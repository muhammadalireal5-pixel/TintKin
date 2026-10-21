import "server-only";
import webpush from "web-push";
import { PushSubscription } from "@/app/lib/mongoose";

// Server-only sender. Deliberately NOT in a "use server" file (see the note at
// the bottom of app/lib/push-actions.js): it takes a userId, so it must never
// be callable from a client.
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;

export const pushConfigured = Boolean(PUBLIC && PRIVATE);

if (pushConfigured) {
  webpush.setVapidDetails("mailto:muhammad0alire@gmail.com", PUBLIC, PRIVATE);
}

/** Sends `payload` to every device `userId` subscribed. Returns how many delivered. */
export async function sendPushToUser(userId, payload) {
  if (!pushConfigured) return 0;
  const subs = await PushSubscription.find({ userId });
  const body = JSON.stringify(payload);
  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body);
        delivered++;
      } catch (err) {
        // The browser says this subscription is gone: stop tracking it.
        if (err?.statusCode === 404 || err?.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id });
      }
    })
  );
  return delivered;
}
