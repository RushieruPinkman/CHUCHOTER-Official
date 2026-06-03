import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, "chuchoter-logo-source.svg");
const outputPath = path.join(__dirname, "../public/images/logo.svg");

const raw = fs.readFileSync(sourcePath, "utf8");
const inner = raw
  .replace(/^<\?xml[^>]*>\s*/i, "")
  .replace(/^<svg[^>]*>/i, "")
  .replace(/<\/svg>\s*$/i, "")
  .replace(/<g>/g, '<g fill="currentColor">');

const output = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <symbol id="chuchoter-logo" viewBox="0 0 1762.51 372.79">
${inner}
  </symbol>
</svg>
`;

fs.writeFileSync(outputPath, output, "utf8");
console.log(`Wrote ${outputPath} (${output.length} bytes)`);
