"use client";

import Link from "next/link";
import { useState } from "react";
import GachaPrizeClaimModal, { type GachaPrizeCastOption } from "@/components/GachaPrizeClaimModal";
import { usePendingGachaPrizes } from "@/hooks/usePendingGachaPrizes";
import { getAuthLoginHref, getAuthRegisterHref } from "@/lib/auth-routes";
import { isAuthDevEnabled } from "@/lib/auth-dev";
import { formatGachaHistoryTimestamp } from "@/lib/gacha-history";
import { getRarityLabel, type GachaDrawResult } from "@/lib/gacha";
import {
  formatGachaSerialLabel,
  GACHA_SERIAL_UNUSED_RETENTION_DAYS,
  shouldIssueGachaSerialNumber,
} from "@/lib/gacha-serial";
import { isUserAuthEnabled } from "@/lib/supabase/config";

interface GachaPrizeStoragePanelProps {
  userKey: string | null;
  authReady?: boolean;
  prizeCasts?: GachaPrizeCastOption[];
  loginNextPath?: string;
  className?: string;
}

export default function GachaPrizeStoragePanel({
  userKey,
  authReady = true,
  prizeCasts = [],
  loginNextPath = "/gacha",
  className = "",
}: GachaPrizeStoragePanelProps) {
  const { prizes, loading, hydrated } = usePendingGachaPrizes(userKey, authReady);
  const devMode = isAuthDevEnabled() && !isUserAuthEnabled();
  const [claimTarget, setClaimTarget] = useState<GachaDrawResult | null>(null);

  return (
    <>
      <section
        className={`gacha-prize-storage mx-auto max-w-xl ${className}`.trim()}
        aria-labelledby="gacha-prize-storage-heading"
      >
        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
            <span className="section-label mb-0.5 block">Vault</span>
            <div className="flex items-end justify-between gap-3">
              <h2 id="gacha-prize-storage-heading" className="font-display text-lg text-gold md:text-xl">
                景品保管庫
              </h2>
              {hydrated && userKey && prizes.length > 0 && (
                <span
                  className="rounded border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] tracking-[0.12em] text-gold"
                  aria-live="polite"
                >
                  {prizes.length}件
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-cream-faint">
              ★4以上の景品は、運営DMで使用するまでここに保管されます。使用後は保管庫から削除されます。
            </p>
          </div>

          <div className="px-4 py-4 md:px-6 md:py-5">
            {!hydrated || loading ? (
              <p className="py-2 text-center text-sm text-cream-faint" role="status">
                読み込み中…
              </p>
            ) : !userKey ? (
              <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-5 py-6 text-center">
                <p className="text-sm leading-relaxed text-cream-muted">
                  ログインすると、★4以上の景品が保管庫に保存されます。
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={getAuthLoginHref(loginNextPath)}
                    className="btn-primary inline-flex min-h-11 items-center px-6"
                  >
                    ログイン
                  </Link>
                  <Link
                    href={getAuthRegisterHref(loginNextPath)}
                    className="btn-ghost inline-flex min-h-11 items-center px-6"
                  >
                    新規登録
                  </Link>
                </div>
              </div>
            ) : prizes.length === 0 ? (
              <div className="profile-collection__empty border border-[var(--color-border)] bg-deep/60 px-5 py-6 text-center">
                <p className="text-sm text-cream-muted">保管中の景品はありません。</p>
                <p className="mt-2 text-xs leading-relaxed text-cream-faint">
                  ★4以上が当選すると、ここに表示されます。
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {prizes.map((prize) => {
                  const serial = prize.serialNumber?.trim() ?? "";
                  const showSerial = serial && shouldIssueGachaSerialNumber(prize.rarity);

                  return (
                    <li
                      key={serial || `${prize.wonAt}-${prize.rarity}`}
                      className="history-record-item collection-exchange-history__item border border-[var(--color-border)] bg-deep/70 px-4 py-4 md:px-5"
                    >
                      <div className="history-record-item__meta">
                        <p className="text-[11px] tracking-[0.15em] text-gold">
                          {getRarityLabel(prize.rarity)}
                        </p>
                        <time
                          dateTime={prize.wonAt}
                          className="text-[11px] tracking-[0.08em] text-cream-faint"
                        >
                          {formatGachaHistoryTimestamp(prize.wonAt)}
                        </time>
                      </div>
                      <div className="history-record-item__main">
                        <div className="history-record-item__text">
                          <p className="font-serif-jp text-base text-cream">{prize.prize.title}</p>
                          <p className="mt-0.5 text-[11px] text-cream-faint">{prize.prize.subtitle}</p>
                          {showSerial && (
                            <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-gold/90">
                              {formatGachaSerialLabel(serial)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setClaimTarget(prize)}
                          disabled={prizeCasts.length === 0}
                          className="history-record-item__action btn-primary px-3 text-xs disabled:opacity-40"
                        >
                          運営DMで使用
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {hydrated && userKey && (
              <p className="mt-4 text-center text-[10px] leading-relaxed text-cream-faint/80">
                未使用の景品は当選から{GACHA_SERIAL_UNUSED_RETENTION_DAYS}日後に自動削除されます。
              </p>
            )}
          </div>
        </div>
      </section>

      {claimTarget && userKey && claimTarget.serialNumber && (
        <GachaPrizeClaimModal
          open
          onClose={() => setClaimTarget(null)}
          result={claimTarget}
          casts={prizeCasts}
          userKey={userKey}
          devMode={devMode}
          onClaimed={() => setClaimTarget(null)}
        />
      )}
    </>
  );
}
