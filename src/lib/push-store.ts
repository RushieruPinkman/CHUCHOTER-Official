import "server-only";

import type {
  PushNotificationKind,
  PushSubscriptionPreferences,
  PushSubscriptionRecord,
} from "@/lib/push-types";
import { isSupabaseConnectionError } from "@/lib/supabase-errors";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface PushSubscriptionRow {
  id: string;
  user_key: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  notify_dm: boolean;
  notify_bonus: boolean;
  notify_gacha: boolean;
  created_at: string;
  updated_at: string;
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /user_push_subscriptions|user_push_notification_log/.test(error.message ?? "")
  );
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapSubscription(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    userKey: row.user_key,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    notifyDm: row.notify_dm,
    notifyBonus: row.notify_bonus,
    notifyGacha: row.notify_gacha,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isPushStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

export async function upsertPushSubscription(
  userKey: string,
  input: {
    endpoint: string;
    p256dh: string;
    auth: string;
    preferences?: Partial<PushSubscriptionPreferences>;
  }
): Promise<PushSubscriptionRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const notifyDm = input.preferences?.notifyDm ?? true;
  const notifyBonus = input.preferences?.notifyBonus ?? true;
  const notifyGacha = input.preferences?.notifyGacha ?? true;

  const { data: existing, error: fetchError } = await supabase
    .from("user_push_subscriptions")
    .select("*")
    .eq("endpoint", input.endpoint)
    .maybeSingle();

  if (fetchError && !isMissingTableError(fetchError)) {
    throw new Error(fetchError.message);
  }
  if (isMissingTableError(fetchError)) {
    throw new Error(
      "プッシュ通知テーブルが未作成です。scripts/supabase-push-notifications.sql を実行してください。"
    );
  }

  if (existing) {
    const { data, error } = await supabase
      .from("user_push_subscriptions")
      .update({
        user_key: userKey,
        p256dh: input.p256dh,
        auth: input.auth,
        notify_dm: notifyDm,
        notify_bonus: notifyBonus,
        notify_gacha: notifyGacha,
        updated_at: now,
      })
      .eq("endpoint", input.endpoint)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapSubscription(data as PushSubscriptionRow);
  }

  const { data, error } = await supabase
    .from("user_push_subscriptions")
    .insert({
      id: createId("push"),
      user_key: userKey,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      notify_dm: notifyDm,
      notify_bonus: notifyBonus,
      notify_gacha: notifyGacha,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSubscription(data as PushSubscriptionRow);
}

export async function deletePushSubscription(userKey: string, endpoint: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from("user_push_subscriptions")
    .delete()
    .eq("user_key", userKey)
    .eq("endpoint", endpoint);

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
  return true;
}

export async function listPushSubscriptionsForUser(
  userKey: string
): Promise<PushSubscriptionRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("user_push_subscriptions")
      .select("*")
      .eq("user_key", userKey);

    if (error) {
      if (isMissingTableError(error) || isSupabaseConnectionError(error)) return [];
      throw new Error(error.message);
    }

    return ((data as PushSubscriptionRow[] | null) ?? []).map(mapSubscription);
  } catch (error) {
    if (isSupabaseConnectionError(error)) return [];
    throw error;
  }
}

export async function listDistinctPushUserKeys(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.from("user_push_subscriptions").select("user_key");

    if (error) {
      if (isMissingTableError(error) || isSupabaseConnectionError(error)) return [];
      throw new Error(error.message);
    }

    const keys = new Set<string>();
    for (const row of (data as { user_key: string }[] | null) ?? []) {
      keys.add(row.user_key);
    }
    return [...keys];
  } catch (error) {
    if (isSupabaseConnectionError(error)) return [];
    throw error;
  }
}

export async function wasPushNotificationSent(
  userKey: string,
  notificationKey: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return true;

  try {
    const { data, error } = await supabase
      .from("user_push_notification_log")
      .select("notification_key")
      .eq("user_key", userKey)
      .eq("notification_key", notificationKey)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error) || isSupabaseConnectionError(error)) return true;
      throw new Error(error.message);
    }

    return Boolean(data);
  } catch (error) {
    if (isSupabaseConnectionError(error)) return true;
    throw error;
  }
}

export async function recordPushNotificationSent(
  userKey: string,
  notificationKey: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("user_push_notification_log").upsert(
    {
      user_key: userKey,
      notification_key: notificationKey,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "user_key,notification_key" }
  );

  if (error && !isMissingTableError(error) && !isSupabaseConnectionError(error)) {
    throw new Error(error.message);
  }
}

export function subscriptionAllowsKind(
  subscription: PushSubscriptionRecord,
  kind: PushNotificationKind
): boolean {
  switch (kind) {
    case "dm_reply":
      return subscription.notifyDm;
    case "bonus_reminder":
      return subscription.notifyBonus;
    case "gacha_free":
      return subscription.notifyGacha;
  }
}
