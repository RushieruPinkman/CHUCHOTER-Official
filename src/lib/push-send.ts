import "server-only";

import webpush from "web-push";
import type { PushNotificationKind, PushPayload } from "@/lib/push-types";
import {
  buildBonusReminderPushPayload,
  buildDmReplyPushPayload,
  buildGachaFreePushPayload,
} from "@/lib/push-payloads";
import {
  listDistinctPushUserKeys,
  listPushSubscriptionsForUser,
  recordPushNotificationSent,
  subscriptionAllowsKind,
  wasPushNotificationSent,
} from "@/lib/push-store";
import { getVapidSubject, isPushConfigured } from "@/lib/push-vapid";
import { countUnclaimedBonuses } from "@/lib/bonus-roulette-shared";
import { getBonusRouletteState } from "@/lib/bonus-roulette-store";
import { hasUsedFreeDrawToday } from "@/lib/cp-store";
import { getGachaDayJst } from "@/lib/gacha-daily-limit";

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (!isPushConfigured()) return false;
  if (vapidConfigured) return true;

  webpush.setVapidDetails(
    getVapidSubject(),
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
  return true;
}

function isExpiredSubscriptionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

async function sendPayloadToEndpoint(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<"sent" | "expired" | "failed"> {
  if (!ensureVapidConfigured()) return "failed";

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (error) {
    if (isExpiredSubscriptionError(error)) return "expired";
    console.error("[push-send] notification failed:", error);
    return "failed";
  }
}

export async function sendPushToUser(
  userKey: string,
  kind: PushNotificationKind,
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: number }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0, expired: 0 };
  }

  const subscriptions = await listPushSubscriptionsForUser(userKey);
  const targets = subscriptions.filter((item) => subscriptionAllowsKind(item, kind));

  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (const subscription of targets) {
    const result = await sendPayloadToEndpoint(subscription, payload);
    if (result === "sent") sent += 1;
    if (result === "failed") failed += 1;
    if (result === "expired") expired += 1;
  }

  return { sent, failed, expired };
}

export async function notifyDmReplyPush(userKey: string, preview: string, messageId: string): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const notificationKey = `dm:${messageId}`;
  if (await wasPushNotificationSent(userKey, notificationKey)) return;

  const result = await sendPushToUser(userKey, "dm_reply", buildDmReplyPushPayload(preview));
  if (result.sent > 0) {
    await recordPushNotificationSent(userKey, notificationKey);
  }
}

export async function sendDailyPushReminders(): Promise<{
  users: number;
  bonusSent: number;
  gachaSent: number;
}> {
  if (!ensureVapidConfigured()) {
    return { users: 0, bonusSent: 0, gachaSent: 0 };
  }

  const userKeys = await listDistinctPushUserKeys();
  const jstDate = getGachaDayJst();
  let bonusSent = 0;
  let gachaSent = 0;

  for (const userKey of userKeys) {
    const bonusKey = `bonus:${jstDate}`;
    if (!(await wasPushNotificationSent(userKey, bonusKey))) {
      try {
        const state = await getBonusRouletteState(userKey);
        const unclaimed = countUnclaimedBonuses(state);
        if (unclaimed > 0) {
          const result = await sendPushToUser(
            userKey,
            "bonus_reminder",
            buildBonusReminderPushPayload(unclaimed)
          );
          if (result.sent > 0) {
            await recordPushNotificationSent(userKey, bonusKey);
            bonusSent += 1;
          }
        }
      } catch (error) {
        console.error("[push-send] bonus reminder failed:", userKey, error);
      }
    }

    const gachaKey = `gacha:free:${jstDate}`;
    if (!(await wasPushNotificationSent(userKey, gachaKey))) {
      try {
        const used = await hasUsedFreeDrawToday(userKey, jstDate);
        if (!used) {
          const result = await sendPushToUser(userKey, "gacha_free", buildGachaFreePushPayload());
          if (result.sent > 0) {
            await recordPushNotificationSent(userKey, gachaKey);
            gachaSent += 1;
          }
        }
      } catch (error) {
        console.error("[push-send] gacha reminder failed:", userKey, error);
      }
    }
  }

  return { users: userKeys.length, bonusSent, gachaSent };
}
