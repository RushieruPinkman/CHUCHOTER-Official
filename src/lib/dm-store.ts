import "server-only";

import { notifyDmReplyPush } from "@/lib/push-send";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  DmAttachmentKind,
  DmAttachmentPayload,
  DmMessage,
  DmSender,
  DmThreadDetail,
  DmThreadSummary,
  DmUnreadSummary,
} from "@/lib/dm";
import {
  buildAdminAttachmentPathPrefix,
  buildDmAttachmentPreview,
  buildUserAttachmentPathPrefix,
  deleteDmAttachmentStorage,
  isAttachmentPathAllowed,
  resolveDmMessageAttachment,
} from "@/lib/dm-attachments";
import { isSupabaseConnectionError } from "@/lib/supabase-errors";

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
  attachment_type: DmAttachmentKind | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
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

async function mapMessagesWithAttachments(
  rows: DmMessageRow[],
  downloadBasePath: string
): Promise<DmMessage[]> {
  return Promise.all(
    rows.map(async (row) => {
      const attachment = await resolveDmMessageAttachment(row.id, row, downloadBasePath);
      return {
        id: row.id,
        threadId: row.thread_id,
        sender: row.sender,
        body: row.body,
        createdAt: row.created_at,
        attachment,
      };
    })
  );
}

function validateAttachmentForUser(userKey: string, attachment?: DmAttachmentPayload | null): DmAttachmentPayload | null {
  if (!attachment) return null;

  const prefix = buildUserAttachmentPathPrefix(userKey);
  if (
    !isAttachmentPathAllowed(attachment.path, prefix) ||
    (attachment.type !== "image" && attachment.type !== "audio")
  ) {
    throw new Error("添付ファイルが無効です。");
  }

  return attachment;
}

function validateAttachmentForAdmin(
  threadId: string,
  attachment?: DmAttachmentPayload | null
): DmAttachmentPayload | null {
  if (!attachment) return null;

  const prefix = buildAdminAttachmentPathPrefix(threadId);
  if (
    !isAttachmentPathAllowed(attachment.path, prefix) ||
    (attachment.type !== "image" && attachment.type !== "audio")
  ) {
    throw new Error("添付ファイルが無効です。");
  }

  return attachment;
}

function validateMessageInput(body: string, attachment?: DmAttachmentPayload | null): string {
  const trimmed = body.trim();
  if (!trimmed && !attachment) {
    throw new Error("メッセージまたは添付ファイルを入力してください。");
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new Error(`メッセージは${MESSAGE_MAX_LENGTH}文字以内で入力してください。`);
  }
  return trimmed;
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /dm_threads|dm_messages/.test(error.message ?? "");
}

function buildPreview(body: string, attachment?: DmAttachmentPayload | null): string {
  const preview = buildDmAttachmentPreview(body, attachment ?? undefined).replace(/\s+/g, " ");
  if (preview.length <= PREVIEW_MAX_LENGTH) return preview;
  return `${preview.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
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

export async function cleanupInactiveDmThreads(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const cutoff = new Date(Date.now() - DM_INACTIVITY_MS).toISOString();

  try {
    const { data: staleThreads, error: fetchError } = await supabase
      .from("dm_threads")
      .select("id")
      .lt("last_message_at", cutoff);

    if (fetchError) {
      if (!isMissingTableError(fetchError) && !isSupabaseConnectionError(fetchError)) {
        console.error("[dm-store] cleanup fetch failed:", fetchError.message);
      }
      return 0;
    }

    if (!staleThreads?.length) {
      return 0;
    }

    const threadIds = staleThreads.map((thread) => thread.id);
    const { data: messages, error: messagesError } = await supabase
      .from("dm_messages")
      .select("attachment_path")
      .in("thread_id", threadIds)
      .not("attachment_path", "is", null);

    if (messagesError && !isMissingTableError(messagesError) && !isSupabaseConnectionError(messagesError)) {
      console.error("[dm-store] cleanup attachment lookup failed:", messagesError.message);
    } else {
      const attachmentPaths = (messages ?? [])
        .map((message) => message.attachment_path)
        .filter((pathValue): pathValue is string => Boolean(pathValue?.trim()));
      if (attachmentPaths.length > 0) {
        await deleteDmAttachmentStorage(attachmentPaths);
      }
    }

    const { error: deleteError } = await supabase.from("dm_threads").delete().lt("last_message_at", cutoff);

    if (deleteError && !isMissingTableError(deleteError) && !isSupabaseConnectionError(deleteError)) {
      console.error("[dm-store] cleanup failed:", deleteError.message);
      return 0;
    }

    return staleThreads.length;
  } catch (error) {
    if (!isSupabaseConnectionError(error)) {
      console.error("[dm-store] cleanup fetch failed:", error);
    }
    return 0;
  }
}

export async function getUserDmThread(userKey: string): Promise<DmThreadSummary | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
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
      if (isSupabaseConnectionError(error)) {
        return null;
      }
      throw new Error(error.message);
    }

    return data ? mapThread(data as DmThreadRow) : null;
  } catch (error) {
    if (isSupabaseConnectionError(error)) {
      return null;
    }
    throw error;
  }
}

export async function getUserDmUnreadSummary(userKey: string): Promise<DmUnreadSummary> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { unreadCount: 0, hasThread: false };
  }

  try {
    const { data, error } = await supabase
      .from("dm_threads")
      .select("user_unread_count")
      .eq("user_key", userKey)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error) || isSupabaseConnectionError(error)) {
        return { unreadCount: 0, hasThread: false };
      }
      throw new Error(error.message);
    }

    if (!data) {
      return { unreadCount: 0, hasThread: false };
    }

    return {
      unreadCount: (data as { user_unread_count: number }).user_unread_count ?? 0,
      hasThread: true,
    };
  } catch (error) {
    if (isSupabaseConnectionError(error)) {
      return { unreadCount: 0, hasThread: false };
    }
    throw error;
  }
}

export async function getUserDmThreadDetail(userKey: string): Promise<DmThreadDetail | null> {
  const thread = await getUserDmThread(userKey);
  if (!thread) return null;

  const messages = await getThreadMessages(thread.id, "/api/dm/attachments");
  return { thread, messages };
}

export async function getThreadMessages(
  threadId: string,
  downloadBasePath = "/api/dm/attachments"
): Promise<DmMessage[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("dm_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingTableError(error) || isSupabaseConnectionError(error)) return [];
      throw new Error(error.message);
    }

    const rows = (data as DmMessageRow[] | null) ?? [];
    return mapMessagesWithAttachments(rows, downloadBasePath);
  } catch (error) {
    if (isSupabaseConnectionError(error)) return [];
    throw error;
  }
}

export async function getDmMessageForDownload(messageId: string): Promise<{
  message: DmMessageRow;
  thread: DmThreadRow;
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: message, error: messageError } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError) {
    if (isMissingTableError(messageError)) return null;
    throw new Error(messageError.message);
  }
  if (!message) return null;

  const { data: thread, error: threadError } = await supabase
    .from("dm_threads")
    .select("*")
    .eq("id", (message as DmMessageRow).thread_id)
    .maybeSingle();

  if (threadError || !thread) {
    return null;
  }

  return {
    message: message as DmMessageRow,
    thread: thread as DmThreadRow,
  };
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

export async function ensureUserDmThread(
  userKey: string,
  userDisplayName: string,
  userEmail: string | null
): Promise<DmThreadSummary> {
  return getOrCreateThread(userKey, userDisplayName, userEmail);
}

export async function sendUserDmMessage(
  userKey: string,
  body: string,
  userDisplayName: string,
  userEmail: string | null,
  attachmentInput?: DmAttachmentPayload | null
): Promise<DmThreadDetail> {
  const attachment = validateAttachmentForUser(userKey, attachmentInput);
  const trimmed = validateMessageInput(body, attachment);

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
    attachment_type: attachment?.type ?? null,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_mime: attachment?.mime ?? null,
  };

  const { error: messageError } = await supabase.from("dm_messages").insert(messageRow);
  if (messageError) {
    throw new Error(messageError.message);
  }

  const { data: updatedThread, error: threadError } = await supabase
    .from("dm_threads")
    .update({
      last_message_at: now,
      last_message_preview: buildPreview(trimmed, attachment),
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

  const messages = await getThreadMessages(thread.id, "/api/dm/attachments");
  return {
    thread: mapThread(updatedThread as DmThreadRow),
    messages,
  };
}

export async function sendAdminDmMessage(
  threadId: string,
  body: string,
  attachmentInput?: DmAttachmentPayload | null
): Promise<DmThreadDetail> {
  const attachment = validateAttachmentForAdmin(threadId, attachmentInput);
  const trimmed = validateMessageInput(body, attachment);

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
    attachment_type: attachment?.type ?? null,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_mime: attachment?.mime ?? null,
  };

  const { error: messageError } = await supabase.from("dm_messages").insert(messageRow);
  if (messageError) {
    throw new Error(messageError.message);
  }

  const { data: updatedThread, error: threadError } = await supabase
    .from("dm_threads")
    .update({
      last_message_at: now,
      last_message_preview: buildPreview(trimmed, attachment),
      user_unread_count: thread.userUnreadCount + 1,
      admin_unread_count: 0,
    })
    .eq("id", thread.id)
    .select("*")
    .single();

  if (threadError || !updatedThread) {
    throw new Error(threadError?.message || "DM スレッドの更新に失敗しました。");
  }

  const messages = await getThreadMessages(thread.id, "/api/admin/dm/attachments");

  void notifyDmReplyPush(
    thread.userKey,
    buildPreview(trimmed, attachment),
    messageRow.id
  ).catch((error) => {
    console.error("[dm-store] DM push notify failed:", error);
  });

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

  const messages = await getThreadMessages(threadId, "/api/admin/dm/attachments");
  return {
    thread: mapThread(data as DmThreadRow),
    messages,
  };
}

export async function getTotalAdminUnreadCount(): Promise<number> {
  const threads = await listAdminDmThreads();
  return threads.reduce((sum, thread) => sum + thread.adminUnreadCount, 0);
}
