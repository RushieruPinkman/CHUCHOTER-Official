"use client";

import { getRarityLabel, type GachaDrawResult } from "@/lib/gacha";

interface GachaTenResultModalProps {
  draws: GachaDrawResult[];
  onClose: () => void;
  onViewDraw: (draw: GachaDrawResult) => void;
}

export default function GachaTenResultModal({
  draws,
  onClose,
  onViewDraw,
}: GachaTenResultModalProps) {
  return (
    <div className="gacha-ten-modal" role="dialog" aria-modal="true" aria-labelledby="gacha-ten-title">
      <button type="button" className="gacha-ten-modal__backdrop" onClick={onClose} aria-label="閉じる" />
      <div className="gacha-ten-modal__panel panel">
        <div className="border-b border-[var(--color-border)] px-5 py-4 md:px-6">
          <p className="section-label mb-1">10 Draws</p>
          <h2 id="gacha-ten-title" className="font-display text-xl text-gold">
            10連結果
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-cream-faint">
            タップで各結果の詳細を表示できます。
          </p>
        </div>
        <ul className="gacha-ten-modal__grid px-4 py-5 md:px-6">
          {draws.map((draw, index) => (
            <li key={`${draw.wonAt}-${index}`}>
              <button
                type="button"
                onClick={() => onViewDraw(draw)}
                className={`gacha-ten-modal__item gacha-ten-modal__item--r${draw.rarity}`}
              >
                <span className="gacha-ten-modal__index">{index + 1}</span>
                <span className="gacha-ten-modal__rarity">{getRarityLabel(draw.rarity)}</span>
                <span className="gacha-ten-modal__title truncate">
                  {draw.cast?.name ?? draw.prize.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--color-border)] px-5 py-4 text-center md:px-6">
          <button type="button" onClick={onClose} className="btn-primary min-h-10 px-6 text-sm">
            閉じる
          </button>
        </div>
      </div>

      {/* detail modal reuses existing component via parent state */}
    </div>
  );
}
