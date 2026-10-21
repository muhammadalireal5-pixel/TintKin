import { subscribeToPush } from "@/app/lib/push-actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;

/**
 * Whether it makes sense to ask this device about reminders right now.
 * iPhones only support web push once the app is on the home screen, so there
 * is nothing to ask until then.
 * @returns {Promise<{ canAsk: boolean }>}
 */
export async function getPushAskStatus() {
  try {
    if (!VAPID_PUBLIC_KEY) return { canAsk: false };
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return { canAsk: false };
    if (isIos() && !isStandalone()) return { canAsk: false };
    if (Notification.permission !== "default") return { canAsk: false };
    const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    const sub = await registration.pushManager.getSubscription();
    return { canAsk: !sub };
  } catch {
    return { canAsk: false };
  }
}

/** Shows the browser permission prompt, then subscribes. Returns "enabled" | "denied" | "error". */
export async function enablePush() {
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const res = await subscribeToPush(sub.toJSON());
    if (!res?.success) {
      await sub.unsubscribe();
      return "error";
    }
    return "enabled";
  } catch {
    return "error";
  }
}
