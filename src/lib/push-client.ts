import type { PushSubscribeRequest, PushSubscriptionPreferences } from "@/lib/push-types";
import { buildCpRequestHeaders } from "@/lib/cp-client";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

async function fetchVapidPublicKey(): Promise<string> {
  const response = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("プッシュ通知の設定が完了していません。");
  }
  const body = (await response.json()) as { publicKey?: string };
  if (!body.publicKey) {
    throw new Error("VAPID 公開鍵を取得できませんでした。");
  }
  return body.publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function subscribeToPushNotifications(
  preferences?: Partial<PushSubscriptionPreferences>
): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("このブラウザはプッシュ通知に対応していません。");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("通知の許可が必要です。");
  }

  const registration = await ensureServiceWorkerRegistration();
  await navigator.serviceWorker.ready;

  const publicKey = await fetchVapidPublicKey();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("プッシュ購読情報の取得に失敗しました。");
  }

  const body: PushSubscribeRequest = {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    preferences,
  };

  const response = await fetch("/api/user/push/subscribe", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "プッシュ通知の登録に失敗しました。");
  }
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  await fetch("/api/user/push/unsubscribe", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify({ endpoint }),
  });
}

export async function updatePushPreferences(
  preferences: Partial<PushSubscriptionPreferences>
): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    throw new Error("プッシュ通知が有効になっていません。");
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("プッシュ購読情報の取得に失敗しました。");
  }

  const response = await fetch("/api/user/push/subscribe", {
    method: "POST",
    headers: await buildCpRequestHeaders(),
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      preferences,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "通知設定の更新に失敗しました。");
  }
}

export async function getLocalPushSubscriptionState(): Promise<{
  subscribed: boolean;
  permission: NotificationPermission | "unsupported";
}> {
  if (!isPushSupported()) {
    return { subscribed: false, permission: "unsupported" };
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();

  return {
    subscribed: Boolean(subscription),
    permission: Notification.permission,
  };
}
