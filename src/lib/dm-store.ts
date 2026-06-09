import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { DmMessage, DmSender, DmThreadDetail, DmThreadSummary, DmUnreadSummary } from "@/lib/dm";

const DM_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;
const MESSAGE_MAX_LENGTH = 2000;
const PREVIEW_MAX_LENGTH = 120;

interface DmThreadRow {
  id: string;
  user_key: string;
  user_display_name: string;
  user_email: string | null;
  last_message_at: string;
  last_message_preview: string;
  user_unread_count: number;
  admin_unread_count: number;
  created_at: string;
}

interface DmMessageRow {
  id: string;
  thread_id: string;
  sender: DmSender;
  body: string;
  created_at: string;
}

function mapThread(row: DmThreadRow): DmThreadSummary {
  return {
    id: row.id,
    userKey: row.user_key,
    userDisplayName: row.user_display_name,
    userEmail: row.user_email,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    userUnreadCount: row.user_unread_count,
    adminUnreadCount: row.admin_unread_count,
    createdAt: row.created_at,
  };
}

function mapMessage(row: DmMessageRow): DmMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at,
  };
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /dm_threads|dm_messages/.test(error.message ?? "");
}

function buildPreview(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (trimmed.length <= PREVIEW_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isDmStoreEnabled(): boolean {
  return Boolean(getSupabaseAdmin());
}

export async function cleanupInactiveDmThreads(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const cutoff = new Date(Date.now() - DM_INACTIVITY_MS).toISOString();
  const { error } = await supabase.from("dm_threads").delete().lt("last_message_at", cutoff);

  if (error && !isMissingTableError(error)) {
    console.error("[dm-store] cleanup failed:", error.message);
  }
}

export async function getUserDmThread(userKey: string): Promise<DmThreadSummary | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  await cleanupInactiveDmThreads();

  const { data, error } = await supabase
    .from("dm_threads")
    .select("*")
    .eq("user_key", userKey)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("dm_threads テーブルが未作成です。scripts/supabase-dm.sql を実行してください。");
    }
    throw new Error(error.message);
  }

  return data ? mapThread(data as DmThreadRow) : null;
}

export async function getUserDmUnreadSummary(userKey: string): Promise<DmUnreadSummary> {
  const thread = await getUserDmThread(userKey);
  if (!thread) {
    return { unreadCount: 0, hasThread: false };
  }

  return {
    unreadCount: thread.userUnreadCount,
    hasThread: true,
  };
}

export async function getUserDmThreadDetail(userKey: string): Promise<DmThreadDetail | null> {
  const thread = await getUserDmThread(userKey);
  if (!thread) return null;

  const messages = await getThreadMessages(thread.id);
  return { thread, messages };
}

export async function getThreadMessages(threadId: string): Promise<DmMessage[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return ((data as DmMessageRow[] | null) ?? []).map(mapMessage);
}

export async function markThreadReadByUser(threadId: string, userKey: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("dm_threads")
    .update({ user_unread_count: 0 })
    .eq("id", threadId)
    .eq("user_key", userKey);

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
}

export async function markThreadReadByAdmin(threadId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from("dm_threads")
    .update({ admin_unread_count: 0 })
    .eq("id", threadId);

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
}

async function getOrCreateThread(
  userKey: string,
  userDisplayName: string,
  userEmail: string | null
): Promise<DmThreadSummary> {
  const existing = await getUserDmThread(userKey);
  if (existing) {
    if (existing.userDisplayName !== userDisplayName || existing.userEmail !== userEmail) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase
          .from("dm_threads")
          .update({
            user_display_name: userDisplayName,
            user_email: userEmail,
          })
          .eq("id", existing.id);
      }
      return {
        ...existing,
        userDisplayName,
        userEmail,
      };
    }
    return existing;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase が未設定のため DM を利用できません。");
  }

  const row = {
    id: createId("thread"),
    user_key: userKey,
    user_display_name: userDisplayName,
    user_email: userEmail,
    last_message_at: new Date().toISOString(),
    last_message_preview: "",
    user_unread_count: 0,
    admin_unread_count: 0,
  };

  const { data, error } = await supabase.from("dm_threads").insert(row).select("*").single();
  if (error || !data) {
    if (isMissingTableError(error)) {
      throw new Error("dm_threads テーブルが未作成です。scripts/supabase-dm.sql を実行してください。");
    }
    throw new Error(error?.message || "DM スレッドの作成に失敗しました。");
  }

  return mapThread(data as DmThreadRow);
}

export async function sendUserDmMessage(
  userKey: string,
  body: string,
  userDisplayName: string,
  userEmail: string | null
): Promise<DmThreadDetail> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("メッセージを入力してください。");
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new Error(`メッセージは${MESSAGE_MAX_LENGTH}文字以内で入力してください。`);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase が未設定のため DM を送信できません。");
  }

  const thread = await getOrCreateThread(userKey, userDisplayName, userEmail);
  const now = new Date().toISOString();
  const messageRow = {
    id: createId("msg"),
    thread_id: thread.id,
    sender: "user" as const,
    body: trimmed,
    created_at: now,
  };

  const { error: messageError } = await supabase.from("dm_messages").insert(messageRow);
  if (messageError) {
    throw new Error(messageError.message);
  }

  const { data: updatedThread, error: threadError } = await supabase
    .from("dm_threads")
    .update({
      last_message_at: now,
      last_message_preview: buildPreview(trimmed),
      admin_unread_count: thread.adminUnreadCount + 1,
      user_display_name: userDisplayName,
      user_email: userEmail,
    })
    .eq("id", thread.id)
    .select("*")
    .single();

  if (threadError || !updatedThread) {
    throw new Error(threadError?.message || "DM スレッドの更新に失敗しました。");
  }

  const messages = await getThreadMessages(thread.id);
  return {
    thread: mapThread(updatedThread as DmThreadRow),
    messages,
  };
}

export async function sendAdminDmMessage(threadId: string, body: string): Promise<DmThreadDetail> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("メッセージを入力してください。");
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new Error(`メッセージは${MESSAGE_MAX_LENGTH}文字以内で入力してください。`);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase が未設定のため DM を送信できません。");
  }

  const { data: threadRow, error: threadFetchError } = await supabase
    .from("dm_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (threadFetchError || !threadRow) {
    throw new Error("DM スレッドが見つかりません。");
  }

  const thread = mapThread(threadRow as DmThreadRow);
  const now = new Date().toISOString();
  const messageRow = {
    id: createId("msg"),
    thread_id: thread.id,
    sender: "admin" as const,
    body: trimmed,
    created_at: now,
  };

  const { error: messageError } = await supabase.from("dm_messages").insert(messageRow);
  if (messageError) {
    throw new Error(messageError.message);
  }

  const { data: updatedThread, error: threadError } = await supabase
    .from("dm_threads")
    .update({
      last_message_at: now,
      last_message_preview: buildPreview(trimmed),
      user_unread_count: thread.userUnreadCount + 1,
      admin_unread_count: 0,
    })
    .eq("id", thread.id)
    .select("*")
    .single();

  if (threadError || !updatedThread) {
    throw new Error(threadError?.message || "DM スレッドの更新に失敗しました。");
  }

  const messages = await getThreadMessages(thread.id);
  return {
    thread: mapThread(updatedThread as DmThreadRow),
    messages,
  };
}

export async function listAdminDmThreads(): Promise<DmThreadSummary[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  await cleanupInactiveDmThreads();

  const { data, error } = await supabase
    .from("dm_threads")
    .select("*")
    .order("admin_unread_count", { ascending: false })
    .order("last_message_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return ((data as DmThreadRow[] | null) ?? []).map(mapThread);
}

export async function getAdminDmThreadDetail(threadId: string): Promise<DmThreadDetail | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  await cleanupInactiveDmThreads();

  const { data, error } = await supabase.from("dm_threads").select("*").eq("id", threadId).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const messages = await getThreadMessages(threadId);
  return {
    thread: mapThread(data as DmThreadRow),
    messages,
  };
}

export async function getTotalAdminUnreadCount(): Promise<number> {
  const threads = await listAdminDmThreads();
  return threads.reduce((sum, thread) => sum + thread.adminUnreadCount, 0);
}
