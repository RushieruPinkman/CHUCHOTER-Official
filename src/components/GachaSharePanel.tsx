"use client";

import Link from "next/link";
import { useState } from "react";
import { useCollectionUserKey } from "@/hooks/useCollectionUserKey";
import { getAuthLoginHref } from "@/lib/auth-routes";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import {
  buildShareText,
  buildTweetUrl,
  isGachaMiss,
  RARITY_COLORS,
  shouldClaimGachaPrizeViaDm,
  type GachaDrawResult,
} from "@/lib/gacha";
import {
  canClaimGachaPrize,
  getGachaClaimSerial,
  isGachaSerialUsed,
} from "@/lib/gacha-serial";
import { completeDailyTaskFromClient } from "@/lib/cp-client";
import { isUserAuthEnabled } from "@/lib/supabase/config";
import { SITE } from "@/lib/site";
import GachaPrizeTextCard from "@/components/GachaPrizeTextCard";
import GachaPrizeClaimModal, { type GachaPrizeCastOption } from "@/components/GachaPrizeClaimModal";
import XIcon from "@/components/XIcon";

interface GachaSharePanelProps {
  result: GachaDrawResult;
  loginNextPath?: string;
  prizeCasts?: GachaPrizeCastOption[];
  onPrizeClaimed?: () => void;
}

export default function GachaSharePanel({
  result,
  loginNextPath = "/gacha",
  prizeCasts = [],
  onPrizeClaimed,
}: GachaSharePanelProps) {
  const { userKey, ready: authReady } = useCollectionUserKey();
  const devMode = isAuthDevEnabled() && !isUserAuthEnabled();
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  const shareText = buildShareText(result, SITE.url);
  const tweetUrl = buildTweetUrl(shareText);
  const colors = RARITY_COLORS[result.rarity];
  const footer = `${colors.label} · ${SITE.url.replace(/^https?:\/\//, "")}`;
  const isMiss = isGachaMiss(result.rarity);
  const needsPrizeClaim = shouldClaimGachaPrizeViaDm(result.rarity) && !isMiss;
  const claimSerial = getGachaClaimSerial(result);
  const serialUsed = isGachaSerialUsed(result);
  const canClaim = canClaimGachaPrize(result) && Boolean(claimSerial);
  const showDmClaim = needsPrizeClaim && canClaim && !serialUsed;

  const handleTweetShare = () => {
    void completeDailyTaskFromClient("share_gacha_on_x").catch(() => {
      /* 既に達成済みなど */
    });
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`gacha-share mt-6 space-y-4 ${isMiss ? "gacha-share--cast-result" : ""}`}>
      <p className="text-center text-xs leading-relaxed text-cream-faint">
        {isMiss ? (
          <>もう一度挑戦して、★2以上の景品を狙いましょう。</>
        ) : needsPrizeClaim ? (
          serialUsed ? (
            <>この景品は受け取り済みです。</>
          ) : (
            <>当選おめでとうございます。運営DMで景品を受け取るか、Xで当選を投稿できます。</>
          )
        ) : (
          <>当選おめでとうございます。Xで当選を投稿できます。</>
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
            serialNumber={result.serialNumber}
            serialStatus={result.serialStatus}
          />
        </div>
      )}

      {needsPrizeClaim && !canClaim && !serialUsed && (
        <p className="text-center text-xs leading-relaxed text-cream-faint">
          景品の受け取り準備中です。ページを再読み込みしてください。
        </p>
      )}

      <div className="gacha-share__actions">
        {showDmClaim &&
          (authReady && userKey ? (
            <button
              type="button"
              onClick={() => setClaimModalOpen(true)}
              disabled={prizeCasts.length === 0}
              className="btn-primary"
            >
              運営DMで受け取る
            </button>
          ) : (
            <Link
              href={getAuthLoginHref(loginNextPath)}
              className="btn-primary inline-flex min-h-11 items-center justify-center"
            >
              ログインして運営DMで受け取る
            </Link>
          ))}

        <button
          type="button"
          onClick={handleTweetShare}
          className="btn-ghost inline-flex items-center justify-center gap-1.5"
          aria-label={isMiss ? "Xで結果を投稿" : "Xで当選を投稿"}
        >
          <XIcon className="h-4 w-4 shrink-0" />
          <span>{isMiss ? "Xで結果を投稿" : "Xで当選を投稿"}</span>
        </button>
      </div>

      {claimModalOpen && userKey && claimSerial && (
        <GachaPrizeClaimModal
          open={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          result={result}
          casts={prizeCasts}
          userKey={userKey}
          devMode={devMode}
          onClaimed={onPrizeClaimed}
        />
      )}
    </div>
  );
}
