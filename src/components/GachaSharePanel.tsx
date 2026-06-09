"use client";

import { useCallback, useState } from "react";
import {
  buildDmUrl,
  buildShareCardText,
  buildShareText,
  buildTweetUrl,
  getGachaPrizeDownload,
  getGachaDmUiSuffix,
  isGachaMiss,
  isGachaPrizeSiteDownloadable,
  RARITY_COLORS,
  type GachaDrawResult,
} from "@/lib/gacha";
import { getGachaReportSerial, getGachaSerialStatusLabel, isGachaSerialUsed } from "@/lib/gacha-serial";
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
  const reportSerial = getGachaReportSerial(result);
  const serialUsed = isGachaSerialUsed(result);

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

  const copySerialNumber = async () => {
    if (!reportSerial) return;

    try {
      await navigator.clipboard.writeText(reportSerial);
      setStatus("シリアルNo.をコピーしました。DM本文に貼り付けてご連絡ください。");
    } catch {
      setStatus("シリアルNo.のコピーに失敗しました。");
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
          <>もう一度挑戦して、★2以上の景品を狙いましょう。</>
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
            へ当選カードとシリアルNo.をDMでお送りください。★4・★5は希望のキャスト名もあわせてお知らせください。
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
            {getGachaDmUiSuffix(result.rarity)}
          </>
        )}
      </p>

      {!isMiss && (
        <>
          {reportSerial && (
            <div className="gacha-serial mx-auto max-w-md text-center">
              <p className="text-[11px] tracking-[0.08em] text-cream-faint">当選報告用シリアルNo.</p>
              <p className="gacha-serial__code mt-2 font-mono text-sm tracking-[0.14em] text-gold md:text-base">
                {reportSerial}
              </p>
              <p
                className={`mt-2 text-xs tracking-[0.08em] ${
                  serialUsed ? "text-amber-200/90" : "text-cream-faint"
                }`}
              >
                {getGachaSerialStatusLabel(result.serialStatus ?? "issued")}
              </p>
              <button
                type="button"
                onClick={copySerialNumber}
                disabled={serialUsed}
                className="btn-ghost mt-3 min-h-10 px-5 text-xs disabled:opacity-40"
              >
                シリアルNo.をコピー
              </button>
              {serialUsed && (
                <p className="mt-2 text-[11px] leading-relaxed text-cream-faint">
                  このシリアルNo.は使用済みです。再報告は不要です。
                </p>
              )}
            </div>
          )}

          <div className={`gacha-share-card gacha-share-card--r${result.rarity}`} data-rarity={result.rarity}>
            <GachaPrizeTextCard
              prize={result.prize}
              rarity={result.rarity}
              showProofHeader
              footer={footer}
              wonAt={result.wonAt}
              serialNumber={result.serialNumber}
              serialStatus={result.serialStatus}
            />
          </div>
        </>
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
