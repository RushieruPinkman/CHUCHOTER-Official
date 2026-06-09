import type { GachaDrawResult } from "@/lib/gacha";
import {
  formatGachaWonAt,
  getGachaPrizeCardDisplay,
  getGachaReceiveLine,
  getRarityLabel,
  isGachaMiss,
  RARITY_COLORS,
  shouldShowGachaWonAt,
} from "@/lib/gacha";
import { formatGachaSerialLabel, getGachaReportSerial } from "@/lib/gacha-serial";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const CARD_PADDING = 60;
const INNER_X = CARD_PADDING;
const INNER_Y = CARD_PADDING;
const INNER_W = CARD_WIDTH - CARD_PADDING * 2;
const INNER_H = CARD_HEIGHT - CARD_PADDING * 2;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const chars = text.split("");
  let line = "";
  let offsetY = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, offsetY);
      line = ch;
      offsetY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, offsetY);
    offsetY += lineHeight;
  }
  return offsetY;
}

function resolveImageUrl(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  if (typeof window !== "undefined") {
    return new URL(src, window.location.origin).href;
  }
  return src;
}

function loadImageForCanvas(src: string): Promise<HTMLImageElement> {
  const url = resolveImageUrl(src);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW: number;
  let drawH: number;
  let drawX: number;

  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x + (w - drawW) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    drawX = x;
  }

  ctx.drawImage(img, drawX, y, drawW, drawH);
}

function drawCardBackground(ctx: CanvasRenderingContext2D, result: GachaDrawResult): void {
  const { rarity } = result;
  const colors = RARITY_COLORS[rarity];

  ctx.fillStyle = "#060605";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const grad = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.35,
    40,
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.35,
    CARD_WIDTH * 0.7
  );
  grad.addColorStop(0, colors.glow);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  drawRoundedRect(ctx, INNER_X, INNER_Y, INNER_W, INNER_H, 24);
  ctx.strokeStyle = colors.main;
  ctx.lineWidth = rarity === 6 ? 6 : 4;
  ctx.stroke();

  if (rarity === 6) {
    for (let i = 0; i < 40; i++) {
      const x = 80 + Math.random() * (CARD_WIDTH - 160);
      const y = 80 + Math.random() * (CARD_HEIGHT - 160);
      const size = 2 + Math.random() * 4;
      ctx.fillStyle = `rgba(253, 224, 71, ${0.3 + Math.random() * 0.7})`;
      ctx.fillRect(x, y, size, size);
    }
  }
}

function drawCardHeader(ctx: CanvasRenderingContext2D, result: GachaDrawResult): void {
  const { rarity } = result;
  const colors = RARITY_COLORS[rarity];
  const isMiss = isGachaMiss(rarity);

  ctx.textAlign = "center";
  ctx.fillStyle = "#c9a962";
  ctx.font = "600 42px Georgia, serif";
  ctx.fillText("CHUCHOTER", CARD_WIDTH / 2, 180);

  ctx.fillStyle = "#9c9890";
  ctx.font = "400 28px sans-serif";
  ctx.fillText(isMiss ? "運命の扉 — 結果" : "運命の扉 — 当選証明", CARD_WIDTH / 2, 230);

  ctx.fillStyle = colors.bright;
  ctx.font = "700 52px Georgia, serif";
  ctx.fillText(getRarityLabel(rarity), CARD_WIDTH / 2, 320);

  ctx.fillStyle = "#9c9890";
  ctx.font = "400 28px sans-serif";
  ctx.fillText(`レアリティ: ${colors.label}`, CARD_WIDTH / 2, 375);
}

function drawCardFooter(ctx: CanvasRenderingContext2D, result: GachaDrawResult): void {
  const { rarity } = result;

  ctx.fillStyle = "#6e6a63";
  ctx.font = "400 26px sans-serif";
  ctx.textAlign = "center";
  const footerText = isGachaMiss(rarity)
    ? "また扉を開けて、景品を狙いましょう"
    : getGachaReceiveLine(rarity).replace("@CHUCHOTER_VRC ", "");
  wrapText(ctx, footerText, CARD_WIDTH / 2, CARD_HEIGHT - 120, CARD_WIDTH - 160, 36);
}

async function drawMissCastShareCard(ctx: CanvasRenderingContext2D, result: GachaDrawResult): Promise<void> {
  const cast = result.cast;
  if (!cast) {
    drawPrizeShareCard(ctx, result);
    return;
  }

  const { rarity, prize } = result;
  const colors = RARITY_COLORS[rarity];
  const display = getGachaPrizeCardDisplay(prize, rarity);

  drawCardBackground(ctx, result);
  drawCardHeader(ctx, result);

  const imageX = 120;
  const imageY = 420;
  const imageW = CARD_WIDTH - 240;
  const imageH = 760;

  let imageLoaded = false;
  try {
    const img = await loadImageForCanvas(cast.image);
    drawRoundedRect(ctx, imageX, imageY, imageW, imageH, 16);
    ctx.save();
    ctx.clip();
    drawImageCover(ctx, img, imageX, imageY, imageW, imageH);

    const overlayGrad = ctx.createLinearGradient(0, imageY + imageH * 0.35, 0, imageY + imageH);
    overlayGrad.addColorStop(0, "rgba(6, 6, 5, 0)");
    overlayGrad.addColorStop(0.5, "rgba(6, 6, 5, 0.45)");
    overlayGrad.addColorStop(1, "rgba(6, 6, 5, 0.94)");
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(imageX, imageY, imageW, imageH);
    ctx.restore();

    ctx.strokeStyle = "rgba(201, 169, 98, 0.35)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, imageX, imageY, imageW, imageH, 16);
    ctx.stroke();
    imageLoaded = true;
  } catch {
    imageLoaded = false;
  }

  ctx.textAlign = "center";

  if (imageLoaded) {
    ctx.fillStyle = colors.bright;
    ctx.font = "700 44px Georgia, serif";
    ctx.fillText(getRarityLabel(rarity), CARD_WIDTH / 2, imageY + imageH - 150);

    ctx.fillStyle = "#eae6df";
    ctx.font = "700 40px sans-serif";
    wrapText(ctx, display.primary, CARD_WIDTH / 2, imageY + imageH - 95, imageW - 80, 48);
  } else {
    ctx.fillStyle = "#eae6df";
    ctx.font = "700 48px sans-serif";
    ctx.fillText(cast.name, CARD_WIDTH / 2, 500);

    ctx.fillStyle = colors.bright;
    ctx.font = "400 32px sans-serif";
    ctx.fillText(cast.nameEn, CARD_WIDTH / 2, 560);

    ctx.fillStyle = "#9c9890";
    ctx.font = "400 30px sans-serif";
    wrapText(ctx, display.primary, CARD_WIDTH / 2, 630, CARD_WIDTH - 200, 44);
  }

  drawCardFooter(ctx, result);
}

function drawPrizeShareCard(ctx: CanvasRenderingContext2D, result: GachaDrawResult): void {
  const { rarity, prize } = result;
  const colors = RARITY_COLORS[rarity];
  const display = getGachaPrizeCardDisplay(prize, rarity);

  drawCardBackground(ctx, result);
  drawCardHeader(ctx, result);

  ctx.textAlign = "center";
  ctx.fillStyle = "#eae6df";
  ctx.font = "700 56px sans-serif";
  ctx.fillText(display.primary, CARD_WIDTH / 2, 460);

  let nextY = 520;
  if (display.secondary) {
    ctx.fillStyle = colors.bright;
    ctx.font = "400 32px sans-serif";
    ctx.fillText(display.secondary, CARD_WIDTH / 2, nextY);
    nextY += 56;
  }

  if (display.detail) {
    ctx.fillStyle = "#9c9890";
    ctx.font = "400 30px sans-serif";
    nextY = wrapText(ctx, display.detail, CARD_WIDTH / 2, nextY, CARD_WIDTH - 200, 44);
  }

  if (shouldShowGachaWonAt(rarity)) {
    nextY += 32;
    ctx.fillStyle = "#9c9890";
    ctx.font = "400 28px sans-serif";
    ctx.fillText(`獲得日時: ${formatGachaWonAt(result.wonAt)}`, CARD_WIDTH / 2, nextY);
  }

  const serial = getGachaReportSerial(result);
  if (serial) {
    nextY += 48;
    ctx.fillStyle = "#c9a962";
    ctx.font = "600 30px monospace";
    ctx.fillText(formatGachaSerialLabel(serial), CARD_WIDTH / 2, nextY);
  }

  drawCardFooter(ctx, result);
}

async function drawShareCardCanvas(ctx: CanvasRenderingContext2D, result: GachaDrawResult): Promise<void> {
  if (isGachaMiss(result.rarity) && result.cast) {
    await drawMissCastShareCard(ctx, result);
    return;
  }

  drawPrizeShareCard(ctx, result);
}

export async function renderGachaShareImageFromResult(result: GachaDrawResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await drawShareCardCanvas(ctx, result);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });
}
