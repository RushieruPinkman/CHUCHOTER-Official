/**
 * ガチャ景品（★1〜★3）の配布用 PNG を生成
 * 実行: node scripts/build-gacha-prizes.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "gacha", "prizes");
const IMAGES = path.join(ROOT, "public", "images");
const SOURCES = path.join(ROOT, "public", "gacha", "sources");

const LEGACY_WEBP = ["chuchoter-wallpaper.webp", "chuchoter-group-photo.webp"];

async function buildWallpaper() {
  const input = path.join(SOURCES, "chuchoter-wallpaper.jpg");
  const output = path.join(OUT, "chuchoter-wallpaper.png");
  await sharp(input)
    .rotate()
    .resize(2560, 1440, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log("wallpaper:", output);
}

async function buildGroupPhoto() {
  const castA = path.join(IMAGES, "casts", "le-ciel-blanc.webp");
  const castB = path.join(IMAGES, "casts", "kasane.webp");
  const width = 1920;
  const height = 1080;
  const panelWidth = Math.floor(width / 2);

  const [left, right] = await Promise.all([
    sharp(castA).rotate().resize(panelWidth, height, { fit: "cover", position: "top" }).toBuffer(),
    sharp(castB).rotate().resize(panelWidth, height, { fit: "cover", position: "top" }).toBuffer(),
  ]);

  const output = path.join(OUT, "chuchoter-group-photo.png");
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 12, g: 10, b: 18 },
    },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: panelWidth, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log("group photo:", output);
}

async function buildLogoPng() {
  const svgPath = path.join(IMAGES, "logo.svg");
  const svg = await fs.readFile(svgPath, "utf8");
  const symbolMatch = svg.match(/<symbol id="chuchoter-logo" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/i);
  if (!symbolMatch) throw new Error("logo symbol not found");

  const standalone = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbolMatch[1]}">`,
    symbolMatch[2].replace(/fill="currentColor"/g, 'fill="#c9a962"'),
    "</svg>",
  ].join("\n");

  const output = path.join(OUT, "chuchoter-logo.png");
  await sharp(Buffer.from(standalone))
    .resize(2400, null, { fit: "inside" })
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log("logo png:", output);
}

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(SOURCES, { recursive: true });
await buildWallpaper();
await buildGroupPhoto();
await buildLogoPng();

for (const name of LEGACY_WEBP) {
  const legacyPath = path.join(OUT, name);
  await fs.rm(legacyPath, { force: true });
}

console.log("Done.");
