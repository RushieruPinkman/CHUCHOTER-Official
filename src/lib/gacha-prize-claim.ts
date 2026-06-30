import "server-only";

import { getCasts } from "@/lib/data";
import { copyCastPrizeAssetToDmAttachment } from "@/lib/gacha-prize-asset";
import { getGachaSerialsForUser, markGachaSerialUsed } from "@/lib/gacha-serial-store";
import { notifyDiscordGachaPrizePending } from "@/lib/dm-discord";
import { ensureUserDmThread, sendAdminDmMessage } from "@/lib/dm-store";
import type { Cast } from "@/types";

export const GACHA_PRIZE_CONGRATS_MESSAGE = "おめでとうございます！";

export const GACHA_PRIZE_SIGN_DELIVERY_MESSAGE = `おめでとうございます！
サインカードをお届けします。下の「ダウンロード」から画像を保存できます。`;

export const GACHA_PRIZE_VOICE_DELIVERY_MESSAGE = `おめでとうございます！
ボイスをお届けします。下の「ダウンロード」から音声ファイルを保存できます。`;

export const GACHA_PRIZE_PENDING_SIGN_MESSAGE =
  "ただいま住民さんが心を込めてサインを書いてくれているので少々お待ちください。";

export const GACHA_PRIZE_PENDING_VOICE_MESSAGE =
  "ただいま住民さんが心を込めてボイスを収録してくれているので少々お待ちください。";

export const GACHA_PRIZE_VIP_FOLLOWUP_MESSAGE = `おめでとうございます！
次回営業日以降使用可能ですので、利用される場合にまたご連絡ください。
営業日の19:30までにご連絡いただきますようよろしくお願いいたします。`;

export interface ClaimGachaPrizeResult {
  threadId: string;
  fulfilledAutomatically: boolean;
  pendingManualFulfillment: boolean;
}

export interface ClaimGachaPrizeInput {
  userKey: string;
  userDisplayName: string;
  userEmail: string | null;
  serial: string;
  castId: string;
}

function findActiveCast(casts: Cast[], castId: string): Cast | null {
  return casts.find((cast) => cast.id === castId && cast.active) ?? null;
}

async function deliverAdminPrizeMessage(params: {
  threadId: string;
  body: string;
  assetUrl?: string | null;
  assetKind?: "image" | "audio";
}): Promise<boolean> {
  let attachment = null;
  if (params.assetUrl && params.assetKind) {
    try {
      attachment = await copyCastPrizeAssetToDmAttachment({
        assetUrl: params.assetUrl,
        threadId: params.threadId,
        kind: params.assetKind,
      });
    } catch (error) {
      console.error("[gacha-prize-claim] asset copy failed:", error);
      return false;
    }
  }

  if (params.assetUrl && params.assetKind && !attachment) {
    return false;
  }

  await sendAdminDmMessage(params.threadId, params.body, attachment);
  return true;
}

export async function claimGachaPrize(input: ClaimGachaPrizeInput): Promise<ClaimGachaPrizeResult> {
  const serial = input.serial.trim();
  const [serialRecord] = await getGachaSerialsForUser([serial], input.userKey);

  if (!serialRecord) {
    throw new Error("当選情報が見つかりません。もう一度ガチャ結果をご確認ください。");
  }
  if (serialRecord.status === "used") {
    throw new Error("この景品はすでに受け取り済みです。");
  }
  if (serialRecord.rarity < 4 || serialRecord.rarity > 6) {
    throw new Error("この景品は自動受け取りの対象外です。");
  }

  const casts = await getCasts();
  const cast = findActiveCast(casts, input.castId);
  if (!cast) {
    throw new Error("選択したキャストが見つかりません。");
  }

  const markResult = await markGachaSerialUsed(serial, { castName: cast.name });
  if (!markResult.ok) {
    throw new Error(markResult.error);
  }
  if (markResult.alreadyUsed) {
    throw new Error("この景品はすでに受け取り済みです。");
  }

  const thread = await ensureUserDmThread(input.userKey, input.userDisplayName, input.userEmail);

  let fulfilledAutomatically = false;
  let pendingManualFulfillment = false;

  if (serialRecord.rarity === 4) {
    if (cast.gachaSignCardUrl?.trim()) {
      const delivered = await deliverAdminPrizeMessage({
        threadId: thread.id,
        body: GACHA_PRIZE_SIGN_DELIVERY_MESSAGE,
        assetUrl: cast.gachaSignCardUrl,
        assetKind: "image",
      });
      if (delivered) {
        fulfilledAutomatically = true;
      } else {
        await sendAdminDmMessage(thread.id, GACHA_PRIZE_PENDING_SIGN_MESSAGE);
        pendingManualFulfillment = true;
        await notifyDiscordGachaPrizePending({
          userDisplayName: input.userDisplayName,
          userEmail: input.userEmail,
          threadId: thread.id,
          rarity: serialRecord.rarity,
          prizeTitle: serialRecord.prizeTitle,
          castName: cast.name,
          reason: "sign_card_missing",
        });
      }
    } else {
      await sendAdminDmMessage(thread.id, GACHA_PRIZE_PENDING_SIGN_MESSAGE);
      pendingManualFulfillment = true;
      await notifyDiscordGachaPrizePending({
        userDisplayName: input.userDisplayName,
        userEmail: input.userEmail,
        threadId: thread.id,
        rarity: serialRecord.rarity,
        prizeTitle: serialRecord.prizeTitle,
        castName: cast.name,
        reason: "sign_card_missing",
      });
    }
  } else if (serialRecord.rarity === 5) {
    if (cast.gachaVoiceUrl?.trim()) {
      const delivered = await deliverAdminPrizeMessage({
        threadId: thread.id,
        body: GACHA_PRIZE_VOICE_DELIVERY_MESSAGE,
        assetUrl: cast.gachaVoiceUrl,
        assetKind: "audio",
      });
      if (delivered) {
        fulfilledAutomatically = true;
      } else {
        await sendAdminDmMessage(thread.id, GACHA_PRIZE_PENDING_VOICE_MESSAGE);
        pendingManualFulfillment = true;
        await notifyDiscordGachaPrizePending({
          userDisplayName: input.userDisplayName,
          userEmail: input.userEmail,
          threadId: thread.id,
          rarity: serialRecord.rarity,
          prizeTitle: serialRecord.prizeTitle,
          castName: cast.name,
          reason: "voice_missing",
        });
      }
    } else {
      await sendAdminDmMessage(thread.id, GACHA_PRIZE_PENDING_VOICE_MESSAGE);
      pendingManualFulfillment = true;
      await notifyDiscordGachaPrizePending({
        userDisplayName: input.userDisplayName,
        userEmail: input.userEmail,
        threadId: thread.id,
        rarity: serialRecord.rarity,
        prizeTitle: serialRecord.prizeTitle,
        castName: cast.name,
        reason: "voice_missing",
      });
    }
  } else if (serialRecord.rarity === 6) {
    await sendAdminDmMessage(thread.id, GACHA_PRIZE_CONGRATS_MESSAGE);
    await sendAdminDmMessage(thread.id, GACHA_PRIZE_VIP_FOLLOWUP_MESSAGE);
    fulfilledAutomatically = true;
  }

  return {
    threadId: thread.id,
    fulfilledAutomatically,
    pendingManualFulfillment,
  };
}
