/**
 * public/images 内の大きな PNG を WebP に変換（ローカル・本番の転送量削減）
 * 実行: node scripts/optimize-public-images.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "images");

const JOBS = [
  {
    input: "VRChat_2026-06-03_20-04-04.166_2560x1440.png",
    output: "hero.webp",
    resize: { width: 1920, height: 1080, fit: "cover" },
    quality: 82,
  },
  {
    input: path.join("casts", "VRChat_2026-04-11_20-26-08.862_1080x1920.png"),
    output: path.join("casts", "le-ciel-blanc.webp"),
    resize: { width: 900, height: 1200, fit: "cover" },
    quality: 85,
  },
  {
    input: path.join("casts", "VRChat_2026-03-03_18-01-26.989_2160x3840.png"),
    output: path.join("casts", "kasane.webp"),
    resize: { width: 900, height: 1200, fit: "cover" },
    quality: 85,
  },
];

async function optimizeJob(job) {
  const inputPath = path.join(ROOT, job.input);
  const outputPath = path.join(ROOT, job.output);
  const before = (await fs.stat(inputPath)).size;
  await sharp(inputPath)
    .rotate()
    .resize(job.resize)
    .webp({ quality: job.quality })
    .toFile(outputPath);
  const after = (await fs.stat(outputPath)).size;
  console.log(
    `${job.output}: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024).toFixed(0)} KB`
  );
}

for (const job of JOBS) {
  await optimizeJob(job);
}

console.log("Done. Update site.ts / data/casts.json paths if needed.");
