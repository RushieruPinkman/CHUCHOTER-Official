import "server-only";

import { getDmSettingsFresh } from "@/lib/data";

function normalizeDiscordWebhookUrl(raw: string): string {
  return raw.trim();
}

function isDiscordWebhookUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "discord.com" || parsed.hostname === "discordapp.com") &&
      parsed.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

async function postDiscordWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; status?: number; detail: string }> {
  if (!isDiscordWebhookUrl(webhookUrl)) {
    return { ok: false, detail: "Discord Webhook URL の形式が正しくありません。" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("[dm-discord] webhook failed:", response.status, detail);
      return {
        ok: false,
        status: response.status,
        detail: detail || `Discord が ${response.status} を返しました。`,
      };
    }

    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "ネットワークエラー";
    console.error("[dm-discord] webhook error:", error);
    return { ok: false, detail };
  }
}

export async function notifyDiscordGachaPrizePending(params: {
  userDisplayName: string;
  userEmail: string | null;
  threadId: string;
  rarity: number;
  prizeTitle: string;
  castName: string;
  reason: "sign_card_missing" | "voice_missing";
}): Promise<void> {
  const settings = await getDmSettingsFresh();
  const webhookUrl = normalizeDiscordWebhookUrl(settings.discordWebhookUrl);
  if (!webhookUrl) {
    console.warn("[dm-discord] gacha pending webhook skipped: URL is not configured");
    return;
  }

  const assetLabel = params.reason === "sign_card_missing" ? "サインカード" : "シチュエーションボイス";
  const description = [
    `★${params.rarity}「${params.prizeTitle}」の景品受け取りで、${params.castName} さんの${assetLabel}が未登録のため待機メッセージを自動送信しました。`,
    "住民管理で景品を登録し、DMから手動でお届けください。",
  ].join("\n");

  await postDiscordWebhook(webhookUrl, {
    embeds: [
      {
        title: "【CHUCHOTER】ガチャ景品 — 手動対応が必要です",
        description: description.slice(0, 4000),
        color: 0xc9a962,
        fields: [
          { name: "会員名", value: params.userDisplayName, inline: true },
          { name: "メール", value: params.userEmail || "—", inline: true },
          { name: "希望キャスト", value: params.castName, inline: true },
          { name: "スレッドID", value: params.threadId, inline: false },
        ],
        footer: { text: "管理画面 → DM タブで返信できます" },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function notifyDiscordDmMessage(params: {
  userDisplayName: string;
  userEmail: string | null;
  body: string;
  threadId: string;
  attachmentType?: "image" | "audio" | null;
}): Promise<void> {
  const settings = await getDmSettingsFresh();
  const webhookUrl = normalizeDiscordWebhookUrl(settings.discordWebhookUrl);
  if (!webhookUrl) {
    console.warn("[dm-discord] webhook skipped: URL is not configured (admin DM tab or DISCORD_DM_WEBHOOK_URL)");
    return;
  }

  const attachmentLabel =
    params.attachmentType === "image"
      ? "[画像]"
      : params.attachmentType === "audio"
        ? "[音声]"
        : null;
  const description = [params.body.trim(), attachmentLabel].filter(Boolean).join("\n").slice(0, 4000) || "（添付のみ）";

  await postDiscordWebhook(webhookUrl, {
    embeds: [
      {
        title: "【CHUCHOTER】運営DM — 新着メッセージ",
        description,
        color: 0xc9a962,
        fields: [
          { name: "会員名", value: params.userDisplayName, inline: true },
          { name: "メール", value: params.userEmail || "—", inline: true },
          { name: "スレッドID", value: params.threadId, inline: false },
        ],
        footer: { text: "管理画面 → DM タブで返信できます" },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function sendDiscordDmTestWebhook(
  webhookUrlInput?: string
): Promise<{ ok: true } | { ok: false; detail: string }> {
  const settings = await getDmSettingsFresh();
  const webhookUrl = normalizeDiscordWebhookUrl(webhookUrlInput ?? settings.discordWebhookUrl);
  if (!webhookUrl) {
    return { ok: false, detail: "Webhook URL が未設定です。" };
  }

  const result = await postDiscordWebhook(webhookUrl, {
    embeds: [
      {
        title: "【CHUCHOTER】Webhook テスト",
        description: "運営DMの Discord 通知設定は正常です。",
        color: 0xc9a962,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (!result.ok) {
    return { ok: false, detail: result.detail };
  }

  return { ok: true };
}
