import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "../public/images/logo.png");

async function makeTransparent() {
  const { data, info } = await sharp(logoPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const threshold = 40;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
      continue;
    }

    const maxChannel = Math.max(r, g, b);
    if (maxChannel <= threshold + 20) {
      const fade = (maxChannel - threshold) / 20;
      data[i + 3] = Math.round(Math.max(0, Math.min(255, fade * 255)));
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(logoPath);

  console.log(`Transparent logo saved: ${info.width}x${info.height}`);
}

makeTransparent().catch(console.error);
