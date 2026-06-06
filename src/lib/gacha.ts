import { SITE } from "@/lib/site";

export type GachaRarity = 1 | 2 | 3 | 4 | 5 | 6;

export const GACHA_RARITIES: GachaRarity[] = [1, 2, 3, 4, 5, 6];

export interface GachaPrizeDownload {
  /** public 配下のパス（例: /gacha/prizes/...） */
  url: string;
  filename: string;
}

export interface GachaPrize {
  rarity: GachaRarity;
  title: string;
  subtitle: string;
  description: string;
  /** ★2〜★3: サイト上で景品データをダウンロード可能 */
  download?: GachaPrizeDownload;
}

/** ガチャ演出・★1住人表示用のキャスト情報 */
export interface GachaCastSnapshot {
  id: string;
  name: string;
  nameEn: string;
  image: string;
}

/** サイト上で景品ファイルを配布する最大レアリティ（★1除く） */
export const GACHA_SITE_DOWNLOAD_MAX_RARITY = 3 as const satisfies GachaRarity;

/** レアリティ別の排出率（合計100） */
export const RARITY_RATE: Record<GachaRarity, number> = {
  1: 50,
  2: 30,
  3: 17,
  4: 2,
  5: 0.95,
  6: 0.05,
};

export const RARITY_COLORS: Record<
  GachaRarity,
  { label: string; main: string; bright: string; glow: string }
> = {
  1: { label: "白", main: "#e7e5e4", bright: "#fafaf9", glow: "rgba(231, 229, 228, 0.45)" },
  2: { label: "青", main: "#3b82f6", bright: "#93c5fd", glow: "rgba(59, 130, 246, 0.5)" },
  3: { label: "緑", main: "#22c55e", bright: "#86efac", glow: "rgba(34, 197, 94, 0.5)" },
  4: { label: "紫", main: "#a855f7", bright: "#e9d5ff", glow: "rgba(168, 85, 247, 0.55)" },
  5: { label: "赤", main: "#ef4444", bright: "#fecaca", glow: "rgba(239, 68, 68, 0.55)" },
  6: { label: "金", main: "#eab308", bright: "#fde047", glow: "rgba(234, 179, 8, 0.65)" },
};

export const GACHA_PRIZES: Record<GachaRarity, GachaPrize> = {
  1: {
    rarity: 1,
    title: "住人登場",
    subtitle: "Resident",
    description: "扉の向こうから住人が現れます",
  },
  2: {
    rarity: 2,
    title: "PC用壁紙",
    subtitle: "Wallpaper",
    description: "CHUCHOTERオリジナルPC用壁紙データ",
    download: {
      url: "/gacha/prizes/chuchoter-wallpaper.png",
      filename: "CHUCHOTER-wallpaper.png",
    },
  },
  3: {
    rarity: 3,
    title: "ロゴPNG",
    subtitle: "Logo PNG",
    description: "CHUCHOTER公式ロゴデータ（透過PNG）",
    download: {
      url: "/gacha/prizes/chuchoter-logo.png",
      filename: "CHUCHOTER-logo.png",
    },
  },
  4: {
    rarity: 4,
    title: "サイン入りデジタル記念カード",
    subtitle: "Signed Card",
    description: "サイン入りデジタル記念カード",
  },
  5: {
    rarity: 5,
    title: "シチュエーションボイス",
    subtitle: "Voice",
    description: "当選者名入り・オリジナルシチュエーションボイス",
  },
  6: {
    rarity: 6,
    title: "イベント招待券",
    subtitle: "VIP Invite",
    description: "指名権付き・特別イベント招待券",
  },
};

export interface GachaDrawResult {
  rarity: GachaRarity;
  prize: GachaPrize;
  /** 抽選確定時刻（ISO 8601） */
  wonAt: string;
  /** ★1時に表示するキャスト */
  cast?: GachaCastSnapshot;
}

function buildMissPrize(cast: GachaCastSnapshot): GachaPrize {
  return {
    ...GACHA_PRIZES[1],
    title: cast.name,
    subtitle: cast.nameEn,
    description: `${cast.name}が扉の向こうに現れました`,
  };
}

export function getRarityLabel(rarity: GachaRarity): string {
  return "★".repeat(rarity);
}

export function getPrizeByRarity(rarity: GachaRarity): GachaPrize {
  return GACHA_PRIZES[rarity];
}

export function isGachaMiss(rarity: GachaRarity): boolean {
  return rarity === 1;
}

export function isGachaPrizeSiteDownloadable(rarity: GachaRarity): boolean {
  return rarity >= 2 && rarity <= GACHA_SITE_DOWNLOAD_MAX_RARITY;
}

export function getGachaPrizeDownload(prize: GachaPrize): GachaPrizeDownload | null {
  return prize.download ?? null;
}

export function shouldShowGachaWonAt(rarity: GachaRarity): boolean {
  return rarity >= 4;
}

/** ★4・★5はDMで希望キャスト名の指定が必要 */
export function shouldIncludeCastNameInGachaDm(rarity: GachaRarity): boolean {
  return rarity === 4 || rarity === 5;
}

export function getGachaDmReceiveLine(rarity: GachaRarity): string {
  if (shouldIncludeCastNameInGachaDm(rarity)) {
    return "当選カードと希望のキャスト名を @CHUCHOTER_VRC へDMでお送りください。";
  }
  return "当選カードを @CHUCHOTER_VRC へDMでお送りください。";
}

/** Xアイコン直後に続けるDM案内（画面表示用） */
export function getGachaDmUiSuffix(rarity: GachaRarity): string {
  if (shouldIncludeCastNameInGachaDm(rarity)) {
    return "へのDMに当選カードと希望のキャスト名をお送りください。";
  }
  return "へのDMに当選カードを添付してご連絡ください。";
}

export function getGachaReceiveLine(rarity: GachaRarity): string {
  if (isGachaPrizeSiteDownloadable(rarity)) {
    return "景品データはサイトからダウンロードできます。";
  }
  return getGachaDmReceiveLine(rarity);
}

export function formatGachaWonAt(iso: string): string {
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

/** 結果カードに載せる文言（同一内容の重複を除く） */
export interface GachaPrizeCardDisplay {
  primary: string;
  secondary?: string;
  detail?: string;
}

function normalizeGachaCardText(value: string): string {
  return value.trim();
}

function isDuplicateGachaCardText(a: string, b: string): boolean {
  const left = normalizeGachaCardText(a);
  const right = normalizeGachaCardText(b);
  return left.length > 0 && left === right;
}

export function getGachaPrizeCardDisplay(
  prize: GachaPrize,
  rarity: GachaRarity
): GachaPrizeCardDisplay {
  if (isGachaMiss(rarity)) {
    return { primary: prize.description };
  }

  const primary = normalizeGachaCardText(prize.title);
  const secondaryRaw = normalizeGachaCardText(prize.subtitle);
  const detailRaw = normalizeGachaCardText(prize.description);

  const secondary = isDuplicateGachaCardText(secondaryRaw, primary)
    ? undefined
    : secondaryRaw || undefined;
  const detail =
    isDuplicateGachaCardText(detailRaw, primary) ||
    (secondary !== undefined && isDuplicateGachaCardText(detailRaw, secondary))
      ? undefined
      : detailRaw || undefined;

  return { primary, secondary, detail };
}

export function pickGachaPrize(
  casts: GachaCastSnapshot[] = [],
  rates: Record<GachaRarity, number> = RARITY_RATE
): GachaDrawResult {
  const wonAt = new Date().toISOString();
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const rarity of GACHA_RARITIES) {
    cumulative += rates[rarity];
    if (roll <= cumulative) {
      if (rarity === 1 && casts.length > 0) {
        const cast = casts[Math.floor(Math.random() * casts.length)]!;
        return { rarity, prize: buildMissPrize(cast), wonAt, cast };
      }
      return { rarity, prize: GACHA_PRIZES[rarity], wonAt };
    }
  }
  if (casts.length > 0) {
    const cast = casts[Math.floor(Math.random() * casts.length)]!;
    return { rarity: 1, prize: buildMissPrize(cast), wonAt, cast };
  }
  return { rarity: 1, prize: GACHA_PRIZES[1], wonAt };
}

export function buildShareText(result: GachaDrawResult, siteUrl: string): string {
  if (isGachaMiss(result.rarity)) {
    const castLine = result.cast
      ? `${result.cast.name}が扉の向こうに現れました`
      : "扉の向こうから住人が現れました";
    return ["CHUCHOTER 運命の扉", castLine, siteUrl, "#CHUCHOTER"].join("\n");
  }

  const receiveLine = getGachaReceiveLine(result.rarity);

  return [
    `CHUCHOTER 運命の扉で${getRarityLabel(result.rarity)}【${result.prize.title}】が当選しました！`,
    "",
    receiveLine,
    siteUrl,
    "#CHUCHOTER",
  ].join("\n");
}

export function buildShareCardText(result: GachaDrawResult, siteUrl: string): string {
  const colors = RARITY_COLORS[result.rarity];
  const header = isGachaMiss(result.rarity) ? "運命の扉 — 結果" : "運命の扉 — 当選証明";
  const lines = [
    "━━━━━━━━━━━━━━━━━━",
    "CHUCHOTER",
    header,
    "━━━━━━━━━━━━━━━━━━",
    "",
    getRarityLabel(result.rarity),
    `レアリティ: ${colors.label}`,
    "",
    `景品: ${result.prize.title}`,
    result.prize.subtitle,
    result.prize.description,
    "",
  ];

  if (shouldShowGachaWonAt(result.rarity)) {
    lines.push(`獲得日時: ${formatGachaWonAt(result.wonAt)}`, "");
  }

  if (isGachaMiss(result.rarity)) {
    lines.push("また扉を開けて、景品を狙いましょう。", siteUrl, "━━━━━━━━━━━━━━━━━━");
  } else {
    lines.push(getGachaReceiveLine(result.rarity), siteUrl, "━━━━━━━━━━━━━━━━━━");
  }

  return lines.join("\n");
}

export function buildDmUrl(text: string): string {
  const params = new URLSearchParams({
    recipient_id: SITE.xRecipientId,
    text,
  });
  return `https://x.com/messages/compose?${params.toString()}`;
}

export function buildTweetUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/** 演出時間（ms） */
export const GACHA_TIMING = {
  stage: 1600,
  /** ★6 最終段の確定演出ボーナス */
  stage3Bonus: 2200,
  reveal: 700,
} as const;

export interface GachaPresentation {
  /** 演出用★（3段階・最終段は必ず当選★と一致） */
  stages: [GachaRarity, GachaRarity, GachaRarity];
  /** 段階間で★が上がる演出があるか */
  hasPromotion: boolean;
  /** 第1→2幕・第2→3幕の★昇格幅（最大2） */
  deltas: [number, number];
}

function flatGachaPresentation(finalRarity: GachaRarity): GachaPresentation {
  return {
    stages: [finalRarity, finalRarity, finalRarity],
    hasPromotion: false,
    deltas: [0, 0],
  };
}

/** 扉を開けた時点の当選★から、3段階の演出用★列を生成 */
export function buildGachaPresentation(finalRarity: GachaRarity): GachaPresentation {
  if (finalRarity === 1 || Math.random() < 0.35) {
    return flatGachaPresentation(finalRarity);
  }

  type StagePair = [GachaRarity, GachaRarity];
  const candidates: StagePair[] = [];

  for (let s1 = 1; s1 <= finalRarity; s1++) {
    for (let s2 = s1; s2 <= finalRarity; s2++) {
      const delta1 = s2 - s1;
      const delta2 = finalRarity - s2;
      if (delta1 > 2) continue;
      if (delta2 < 1 || delta2 > 2) continue;
      if (delta1 === 0 && delta2 === 0) continue;
      candidates.push([s1 as GachaRarity, s2 as GachaRarity]);
    }
  }

  if (candidates.length === 0) {
    return flatGachaPresentation(finalRarity);
  }

  const doubleJumpPaths = candidates.filter(
    ([s1, s2]) => s2 - s1 === 2 || finalRarity - s2 === 2
  );
  const pool =
    Math.random() < 0.42 && doubleJumpPaths.length > 0 ? doubleJumpPaths : candidates;
  const [stage1, stage2] = pool[Math.floor(Math.random() * pool.length)]!;

  const stages: [GachaRarity, GachaRarity, GachaRarity] = [stage1, stage2, finalRarity];
  const deltas: [number, number] = [stage2 - stage1, finalRarity - stage2];

  return {
    stages,
    hasPromotion: deltas[0] > 0 || deltas[1] > 0,
    deltas,
  };
}

export function getStagePromotionDelta(
  script: GachaPresentation,
  stage: 2 | 3
): number {
  return script.deltas[stage - 2];
}

export function getStageDuration(stage: 1 | 2 | 3, finalRarity: GachaRarity): number {
  if (stage === 3 && finalRarity === 6) {
    return GACHA_TIMING.stage + GACHA_TIMING.stage3Bonus;
  }
  return GACHA_TIMING.stage;
}

export function getStageLabel(stage: 1 | 2 | 3, finalRarity: GachaRarity): string {
  if (stage === 3 && finalRarity === 6) return "確定";
  if (stage === 1) return "扉の前";
  if (stage === 2) return "扉が開く";
  return "全開";
}

export function getStageStatus(stage: 1 | 2 | 3, finalRarity: GachaRarity): string {
  if (stage === 3 && finalRarity === 6) return "最高賞の扉が完全に開く…";
  if (stage === 1) return "重い扉が震える…";
  if (stage === 2) return "向こうから光が漏れる…";
  return "扉の向こう側が現れる…";
}

export function getResultMessage(rarity: GachaRarity, title: string, castName?: string): string {
  if (isGachaMiss(rarity)) {
    return castName
      ? "もう一度挑戦して、★2以上の景品を狙いましょう。"
      : "扉を開けて、景品を狙いましょう。";
  }
  if (rarity === 6) return `最高賞「${title}」の当選です！`;
  if (rarity === 5) return `「${title}」が当選しました！`;
  if (rarity >= 4) {
    if (shouldIncludeCastNameInGachaDm(rarity)) {
      return `「${title}」を獲得しました。当選カードと希望のキャスト名をDMでお送りください。`;
    }
    return `「${title}」を獲得しました。`;
  }
  if (isGachaPrizeSiteDownloadable(rarity)) {
    return `「${title}」が当たりました。下のボタンから景品データをダウンロードできます。`;
  }
  return `「${title}」が当たりました。`;
}
