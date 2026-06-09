import "server-only";

import { getDmSettings } from "@/lib/data";

export async function notifyDiscordDmMessage(params: {
  userDisplayName: string;
  userEmail: string | null;
  body: string;
  threadId: string;
}): Promise<void> {
  const settings = await getDmSettings();
  const webhookUrl = settings.discordWebhookUrl.trim();
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "【CHUCHOTER】運営DM — 新着メッセージ",
            description: params.body.slice(0, 4000),
            color: 0xc9a962,
            fields: [
              { name: "会員名", value: params.userDisplayName, inline: true },
              { name: "メール", value: params.userEmail || "—", inline: true },
              { name: "スレッドID", value: params.threadId, inline: false },
            ],
            footer: { text: "管理画面 → シリアル/DM タブで返信できます" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[dm-discord] webhook failed:", response.status, await response.text());
    }
  } catch (error) {
    console.error("[dm-discord] webhook error:", error);
  }
}
