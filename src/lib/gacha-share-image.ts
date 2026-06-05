import type { GachaDrawResult } from "@/lib/gacha";
import {
  getRarityLabel,
  isGachaMiss,
  isGachaPrizeSiteDownloadable,
  RARITY_COLORS,
  shouldShowGachaWonAt,
  formatGachaWonAt,
} from "@/lib/gacha";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

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

function drawShareCardCanvas(ctx: CanvasRenderingContext2D, result: GachaDrawResult): void {
  const { rarity, prize } = result;
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

  drawRoundedRect(ctx, 60, 60, CARD_WIDTH - 120, CARD_HEIGHT - 120, 24);
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

  ctx.textAlign = "center";
  ctx.fillStyle = "#c9a962";
  ctx.font = "600 42px Georgia, serif";
  ctx.fillText("CHUCHOTER", CARD_WIDTH / 2, 180);

  ctx.fillStyle = "#9c9890";
  ctx.font = "400 28px sans-serif";
  ctx.fillText(isGachaMiss(rarity) ? "運命の扉 — 結果" : "運命の扉 — 当選証明", CARD_WIDTH / 2, 230);

  ctx.fillStyle = colors.bright;
  ctx.font = "700 52px Georgia, serif";
  ctx.fillText(getRarityLabel(rarity), CARD_WIDTH / 2, 320);

  ctx.fillStyle = "#9c9890";
  ctx.font = "400 28px sans-serif";
  ctx.fillText(`レアリティ: ${colors.label}`, CARD_WIDTH / 2, 375);

  ctx.fillStyle = "#eae6df";
  ctx.font = "700 56px sans-serif";
  ctx.fillText(prize.title, CARD_WIDTH / 2, 460);

  ctx.fillStyle = colors.bright;
  ctx.font = "400 32px sans-serif";
  ctx.fillText(prize.subtitle, CARD_WIDTH / 2, 520);

  ctx.fillStyle = "#9c9890";
  ctx.font = "400 30px sans-serif";
  let nextY = wrapText(ctx, prize.description, CARD_WIDTH / 2, 590, CARD_WIDTH - 200, 44);

  nextY += 40;
  ctx.fillStyle = colors.bright;
  ctx.font = "400 28px sans-serif";
  ctx.fillText("景品内容", CARD_WIDTH / 2, nextY);
  nextY += 48;
  ctx.fillStyle = "#eae6df";
  ctx.font = "400 32px sans-serif";
  nextY = wrapText(ctx, prize.title, CARD_WIDTH / 2, nextY, CARD_WIDTH - 200, 44);
  nextY = wrapText(ctx, prize.description, CARD_WIDTH / 2, nextY + 8, CARD_WIDTH - 200, 44);

  if (shouldShowGachaWonAt(rarity)) {
    nextY += 32;
    ctx.fillStyle = "#9c9890";
    ctx.font = "400 28px sans-serif";
    ctx.fillText(`獲得日時: ${formatGachaWonAt(result.wonAt)}`, CARD_WIDTH / 2, nextY);
  }

  ctx.fillStyle = "#6e6a63";
  ctx.font = "400 26px sans-serif";
  const footerText = isGachaMiss(rarity)
    ? "また扉を開けて、景品を狙いましょう"
    : isGachaPrizeSiteDownloadable(rarity)
      ? "景品データはサイトからダウンロードできます"
      : "@CHUCHOTER_VRC へDMで当選カードを送信";
  ctx.fillText(footerText, CARD_WIDTH / 2, CARD_HEIGHT - 120);
}

export async function renderGachaShareImageFromResult(result: GachaDrawResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  drawShareCardCanvas(ctx, result);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });
}
