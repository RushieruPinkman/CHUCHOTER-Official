"use client";

import { useCallback, useState } from "react";
import {
  buildDmUrl,
  buildShareCardText,
  buildShareText,
  buildTweetUrl,
  getGachaPrizeDownload,
  isGachaMiss,
  isGachaPrizeSiteDownloadable,
  RARITY_COLORS,
  type GachaDrawResult,
} from "@/lib/gacha";
import { renderGachaShareImageFromResult } from "@/lib/gacha-share-image";
import { SITE } from "@/lib/site";
import GachaPrizeTextCard from "@/components/GachaPrizeTextCard";
import XIcon from "@/components/XIcon";

interface GachaSharePanelProps {
  result: GachaDrawResult;
}

export default function GachaSharePanel({ result }: GachaSharePanelProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const shareText = buildShareText(result, SITE.url);
  const cardText = buildShareCardText(result, SITE.url);
  const dmUrl = buildDmUrl(cardText);
  const tweetUrl = buildTweetUrl(shareText);
  const colors = RARITY_COLORS[result.rarity];
  const footer = `${colors.label} · ${SITE.url.replace(/^https?:\/\//, "")}`;
  const prizeDownload = getGachaPrizeDownload(result.prize);
  const siteDownloadable = isGachaPrizeSiteDownloadable(result.rarity) && prizeDownload !== null;
  const isMiss = isGachaMiss(result.rarity);
  const needsDm = !siteDownloadable && !isMiss;

  const getBlob = useCallback(async () => {
    return renderGachaShareImageFromResult(result);
  }, [result]);

  const downloadPrize = async () => {
    if (!prizeDownload) return;

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(prizeDownload.url);
      if (!response.ok) throw new Error("fetch failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = prizeDownload.filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`「${result.prize.title}」をダウンロードしました。`);
    } catch {
      setStatus("景品のダウンロードに失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  const downloadImage = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chuchoter-gacha-r${result.rarity}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("当選カードを保存しました。");
    } catch {
      setStatus("カードの生成に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  const copyShareCard = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await getBlob();
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error("unsupported");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": Promise.resolve(blob),
        }),
      ]);
      setStatus("当選カード（画像）をコピーしました。XのDMなどに貼り付けて送信できます。");
    } catch {
      setStatus("画像のコピーに失敗しました。「当選カードを保存」をお試しください。");
    } finally {
      setBusy(false);
    }
  };

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setStatus("当選メッセージをコピーしました。");
    } catch {
      setStatus("コピーに失敗しました。");
    }
  };

  const nativeShare = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "CHUCHOTER 当選",
          text: cardText,
        });
        setStatus("共有しました。");
        return;
      }
      await copyShareCard();
    } catch {
      /* ユーザーキャンセル */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`gacha-share mt-6 space-y-4 ${isMiss ? "gacha-share--cast-result" : ""}`}>
      <p className="text-center text-xs leading-relaxed text-cream-faint">
        {isMiss ? (
          <>
            {result.cast?.name ?? "住人"}が扉の向こうに現れました。もう一度挑戦して、★2以上の景品を狙いましょう。
          </>
        ) : siteDownloadable ? (
          <>
            当選おめでとうございます。下のボタンから「{result.prize.title}」をダウンロードできます。
            ★4以上の景品は
            <a
              href={SITE.xUrl}
              className="link-gold inline-flex align-middle text-gold"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="@CHUCHOTER_VRC"
            >
              <XIcon className="h-3.5 w-3.5" />
            </a>
            へ当選カードをDMでお送りください。
          </>
        ) : (
          <>
            当選おめでとうございます。「当選カードをコピー」で画像をコピーするか保存し、
            <a
              href={SITE.xUrl}
              className="link-gold inline-flex align-middle text-gold"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="@CHUCHOTER_VRC"
            >
              <XIcon className="h-3.5 w-3.5" />
            </a>
            へDMでお送りください。
          </>
        )}
      </p>

      {!isMiss && (
        <div className={`gacha-share-card gacha-share-card--r${result.rarity}`} data-rarity={result.rarity}>
          <GachaPrizeTextCard
            prize={result.prize}
            rarity={result.rarity}
            showProofHeader
            footer={footer}
            wonAt={result.wonAt}
          />
        </div>
      )}

      <div className="gacha-share__actions">
        {siteDownloadable && prizeDownload && (
          <button
            type="button"
            onClick={downloadPrize}
            disabled={busy}
            className="btn-primary gacha-share__action--primary"
          >
            景品をダウンロード
          </button>
        )}

        {!siteDownloadable && needsDm && (
          <button
            type="button"
            onClick={copyShareCard}
            disabled={busy}
            className="btn-primary gacha-share__action--primary"
          >
            当選カードをコピー
          </button>
        )}

        <button type="button" onClick={downloadImage} disabled={busy} className="btn-ghost">
          {isMiss ? "結果カードを保存" : "当選カードを保存"}
        </button>

        <button type="button" onClick={copyShareText} className="btn-ghost">
          {isMiss ? "結果文をコピー" : "当選文をコピー"}
        </button>

        {needsDm && (
          <a
            href={dmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost inline-flex items-center justify-center gap-1.5"
            aria-label="公式XのDMを開く"
          >
            <XIcon className="h-4 w-4 shrink-0" />
            <span>公式X DM</span>
          </a>
        )}

        <button type="button" onClick={nativeShare} disabled={busy} className="btn-ghost">
          {isMiss ? "結果を共有" : "当選カードを共有"}
        </button>

        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn-ghost inline-flex items-center justify-center gap-1.5${siteDownloadable || isMiss ? "" : " gacha-share__action--wide"}`}
          aria-label={isMiss ? "Xで結果を投稿" : "Xで当選を投稿"}
        >
          <XIcon className="h-4 w-4 shrink-0" />
          <span>{isMiss ? "結果を投稿" : "当選を投稿"}</span>
        </a>
      </div>

      {status && (
        <p className="text-center text-xs leading-relaxed text-cream-muted" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
