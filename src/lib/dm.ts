export type DmSender = "user" | "admin";
export type DmAttachmentKind = "image" | "audio";

export interface DmMessageAttachment {
  type: DmAttachmentKind;
  path: string;
  name: string;
  mime: string;
  url: string;
  downloadUrl: string;
}

export interface DmMessage {
  id: string;
  threadId: string;
  sender: DmSender;
  body: string;
  createdAt: string;
  attachment?: DmMessageAttachment | null;
}

export interface DmAttachmentPayload {
  type: DmAttachmentKind;
  path: string;
  name: string;
  mime: string;
}

export interface DmThreadSummary {
  id: string;
  userKey: string;
  userDisplayName: string;
  userEmail: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  userUnreadCount: number;
  adminUnreadCount: number;
  createdAt: string;
}

export interface DmThreadDetail {
  thread: DmThreadSummary;
  messages: DmMessage[];
}

export interface DmUnreadSummary {
  unreadCount: number;
  hasThread: boolean;
}

export interface DmSettings {
  discordWebhookUrl: string;
}

export const DM_INACTIVITY_DAYS = 14;

export const DM_RETENTION_NOTICE = `最終メッセージから${DM_INACTIVITY_DAYS}日間やり取りがない場合、会話は自動的に削除されます。`;

export function formatDmTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDmListTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function getDmSenderLabel(sender: DmSender): string {
  return sender === "admin" ? "運営" : "あなた";
}
