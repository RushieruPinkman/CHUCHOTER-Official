"use client";

import { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { USER_HISTORY_MAX_ENTRIES } from "@/lib/history-limits";

interface HistoryDisclosureProps {
  id: string;
  labelEn: string;
  labelJa: string;
  count: number;
  className?: string;
  showClear?: boolean;
  clearTitleJa?: string;
  clearMessage?: string;
  onClear?: () => void;
  children: React.ReactNode;
}

export default function HistoryDisclosure({
  id,
  labelEn,
  labelJa,
  count,
  className = "",
  showClear = false,
  clearTitleJa = "履歴を削除",
  clearMessage = "保存されている履歴をすべて削除します。この操作は取り消せません。",
  onClear,
  children,
}: HistoryDisclosureProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClearConfirm = () => {
    onClear?.();
    setConfirmOpen(false);
  };

  return (
    <>
      <section
        className={`history-disclosure-wrap ${className}`.trim()}
        aria-labelledby={`${id}-heading`}
      >
        <details className="history-disclosure">
          <summary className="history-disclosure__summary">
            <span className="history-disclosure__heading">
              <span className="section-label mb-0.5 block">{labelEn}</span>
              <span id={`${id}-heading`} className="font-display text-lg text-gold md:text-xl">
                {labelJa}
              </span>
            </span>
            <span className="history-disclosure__meta">
              <span className="history-disclosure__count" aria-live="polite">
                {count} / {USER_HISTORY_MAX_ENTRIES}
              </span>
              <span className="history-disclosure__chevron" aria-hidden="true" />
            </span>
          </summary>
          <div className="history-disclosure__panel">
            {children}
            {showClear && onClear && (
              <div className="history-disclosure__actions">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="btn-ghost min-h-10 px-4 text-xs text-cream-faint hover:text-gold"
                >
                  履歴をすべて削除
                </button>
              </div>
            )}
          </div>
        </details>
      </section>

      <ConfirmModal
        open={confirmOpen}
        titleJa={clearTitleJa}
        message={clearMessage}
        confirmLabel="すべて削除"
        onConfirm={handleClearConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
