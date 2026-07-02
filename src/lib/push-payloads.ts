import type { PushPayload } from "@/lib/push-types";

export function buildDmReplyPushPayload(preview: string): PushPayload {
  const body = preview.trim() || "運営からメッセージが届いています。";
  return {
    title: "CHUCHOTER — 運営DM",
    body: body.length > 80 ? `${body.slice(0, 80)}…` : body,
    url: "/dm",
    tag: "dm-reply",
  };
}

export function buildBonusReminderPushPayload(unclaimedCount: number): PushPayload {
  const body =
    unclaimedCount === 1
      ? "受け取り可能なボーナスルーレットがあります。"
      : `受け取り可能なボーナスが ${unclaimedCount} 件あります。`;

  return {
    title: "CHUCHOTER — ボーナス",
    body,
    url: "/bonus",
    tag: "bonus-reminder",
  };
}

export function buildGachaFreePushPayload(): PushPayload {
  return {
    title: "CHUCHOTER — 無料ガチャ",
    body: "本日の無料ガチャが引けます。運命の扉を開きましょう。",
    url: "/gacha",
    tag: "gacha-free",
  };
}
