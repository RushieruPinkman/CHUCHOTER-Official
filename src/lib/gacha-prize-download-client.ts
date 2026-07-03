import type { GachaPrizeDownload } from "@/lib/gacha";

export function downloadGachaPrizeAsset(download: GachaPrizeDownload): void {
  const anchor = document.createElement("a");
  anchor.href = download.url;
  anchor.download = download.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
