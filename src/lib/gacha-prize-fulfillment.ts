import "server-only";

import {
  deliverAdminPrizeMessage,
  GACHA_PRIZE_PENDING_SIGN_MESSAGE,
  GACHA_PRIZE_PENDING_VOICE_MESSAGE,
  GACHA_PRIZE_READY_MESSAGE,
  GACHA_PRIZE_SIGN_DELIVERY_MESSAGE,
  GACHA_PRIZE_VOICE_DELIVERY_MESSAGE,
} from "@/lib/gacha-prize-claim";
import {
  listPendingGachaSerialFulfillmentsForCast,
  markGachaSerialFulfilled,
  type GachaSerialFulfillmentRecord,
} from "@/lib/gacha-serial-store";
import { getUserDmThread, getThreadMessages, sendAdminDmMessage } from "@/lib/dm-store";
import type { Cast } from "@/types";

function getPendingMessageForRarity(rarity: 4 | 5): string {
  return rarity === 4 ? GACHA_PRIZE_PENDING_SIGN_MESSAGE : GACHA_PRIZE_PENDING_VOICE_MESSAGE;
}

function getDeliveryMessageForRarity(rarity: 4 | 5): string {
  return rarity === 4 ? GACHA_PRIZE_SIGN_DELIVERY_MESSAGE : GACHA_PRIZE_VOICE_DELIVERY_MESSAGE;
}

/** 待機メッセージがあり、その後まだ景品が届いていない場合のみ true */
function isAwaitingPendingDelivery(
  messages: Awaited<ReturnType<typeof getThreadMessages>>,
  pendingMessage: string
): boolean {
  const pendingIndex = messages.findLastIndex(
    (message) => message.sender === "admin" && message.body === pendingMessage
  );
  if (pendingIndex === -1) return false;

  const afterPending = messages.slice(pendingIndex + 1);
  const alreadyDelivered = afterPending.some(
    (message) =>
      message.sender === "admin" &&
      (message.body === GACHA_PRIZE_READY_MESSAGE ||
        message.body === GACHA_PRIZE_SIGN_DELIVERY_MESSAGE ||
        message.body === GACHA_PRIZE_VOICE_DELIVERY_MESSAGE ||
        Boolean(message.attachment))
  );
  return !alreadyDelivered;
}

async function resolveThreadId(serial: GachaSerialFulfillmentRecord): Promise<string | null> {
  if (serial.dmThreadId) return serial.dmThreadId;
  const thread = await getUserDmThread(serial.userKey);
  return thread?.id ?? null;
}

async function isSerialAwaitingFulfillment(
  serial: GachaSerialFulfillmentRecord,
  threadId: string
): Promise<boolean> {
  if (serial.fulfillmentStatus === "fulfilled") return false;
  if (serial.fulfillmentStatus === "pending") return true;

  // 移行前データ: 待機メッセージが残っている場合のみ対象（即時配信済みは除外）
  const messages = await getThreadMessages(threadId);
  return isAwaitingPendingDelivery(messages, getPendingMessageForRarity(serial.rarity as 4 | 5));
}

function assetNewlyRegistered(nextUrl: string | undefined, previousUrl: string | undefined): boolean {
  const next = nextUrl?.trim() ?? "";
  const previous = previousUrl?.trim() ?? "";
  return Boolean(next) && next !== previous;
}

async function fulfillPendingSerial(params: {
  serial: GachaSerialFulfillmentRecord;
  assetUrl: string;
  assetKind: "image" | "audio";
  deliveryMessage: string;
}): Promise<boolean> {
  const threadId = await resolveThreadId(params.serial);
  if (!threadId) {
    console.warn("[gacha-prize-fulfillment] thread not found for serial:", params.serial.serial);
    return false;
  }

  if (!(await isSerialAwaitingFulfillment(params.serial, threadId))) {
    if (params.serial.fulfillmentStatus !== "fulfilled") {
      await markGachaSerialFulfilled(params.serial.serial);
    }
    return false;
  }

  await sendAdminDmMessage(threadId, GACHA_PRIZE_READY_MESSAGE);

  const delivered = await deliverAdminPrizeMessage({
    threadId,
    body: params.deliveryMessage,
    assetUrl: params.assetUrl,
    assetKind: params.assetKind,
  });

  if (!delivered) {
    console.error("[gacha-prize-fulfillment] asset delivery failed for serial:", params.serial.serial);
    return false;
  }

  await markGachaSerialFulfilled(params.serial.serial);
  return true;
}

async function fulfillPendingAssetForCast(params: {
  cast: Cast;
  rarity: 4 | 5;
  assetUrl: string;
  assetKind: "image" | "audio";
}): Promise<number> {
  const pendingSerials = await listPendingGachaSerialFulfillmentsForCast({
    castId: params.cast.id,
    castName: params.cast.name,
    rarity: params.rarity,
  });

  if (pendingSerials.length === 0) return 0;

  const deliveryMessage = getDeliveryMessageForRarity(params.rarity);
  let fulfilled = 0;

  for (const serial of pendingSerials) {
    const ok = await fulfillPendingSerial({
      serial,
      assetUrl: params.assetUrl,
      assetKind: params.assetKind,
      deliveryMessage,
    });
    if (ok) fulfilled += 1;
  }

  return fulfilled;
}

/**
 * 今回新たに登録・差し替えされた景品データだけを、
 * そのレアリティを待機中の会員へ自動配信する。
 */
export async function fulfillPendingGachaPrizesForCast(
  cast: Cast,
  previous?: Cast | null
): Promise<{
  signFulfilled: number;
  voiceFulfilled: number;
}> {
  const signUrl = cast.gachaSignCardUrl?.trim();
  const voiceUrl = cast.gachaVoiceUrl?.trim();

  const shouldFulfillSign = assetNewlyRegistered(signUrl, previous?.gachaSignCardUrl);
  const shouldFulfillVoice = assetNewlyRegistered(voiceUrl, previous?.gachaVoiceUrl);

  const [signFulfilled, voiceFulfilled] = await Promise.all([
    shouldFulfillSign && signUrl
      ? fulfillPendingAssetForCast({
          cast,
          rarity: 4,
          assetUrl: signUrl,
          assetKind: "image",
        })
      : Promise.resolve(0),
    shouldFulfillVoice && voiceUrl
      ? fulfillPendingAssetForCast({
          cast,
          rarity: 5,
          assetUrl: voiceUrl,
          assetKind: "audio",
        })
      : Promise.resolve(0),
  ]);

  if (signFulfilled > 0 || voiceFulfilled > 0) {
    console.info(
      `[gacha-prize-fulfillment] auto-delivered for ${cast.name}: sign=${signFulfilled}, voice=${voiceFulfilled}`
    );
  }

  return { signFulfilled, voiceFulfilled };
}
