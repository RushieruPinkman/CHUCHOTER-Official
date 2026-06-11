"use client";

import Link from "next/link";
import {
  CP_DAILY_TASK_TOTAL,
  CP_GACHA_SINGLE_COST,
  CP_GACHA_TEN_COST,
  type DailyTaskDefinition,
} from "@/lib/cp";
import { useCpBalance } from "@/hooks/useCpBalance";

interface DailyTasksPanelProps {
  className?: string;
  showGachaHint?: boolean;
}

function TaskAction({ task }: { task: DailyTaskDefinition & { completed: boolean } }) {
  if (task.completed) {
    return <span className="daily-tasks__done-label">達成 +{task.cp} CP</span>;
  }

  if (task.kind === "share") {
    return (
      <span className="max-w-[8rem] text-[10px] leading-relaxed text-cream-faint">
        結果画面の X ボタン
      </span>
    );
  }

  if (task.href) {
    return (
      <Link href={task.href} className="btn-ghost px-3 py-2 text-[11px]">
        {task.kind === "draw" ? "ガチャへ" : "ページへ"}
      </Link>
    );
  }

  return null;
}

export default function DailyTasksPanel({
  className = "",
  showGachaHint = true,
}: DailyTasksPanelProps) {
  const { state, loading, error, balance } = useCpBalance();

  if (loading) {
    return (
      <div className={`daily-tasks panel p-6 ${className}`.trim()}>
        <p className="text-sm text-cream-faint">デイリータスクを読み込み中…</p>
      </div>
    );
  }

  if (!state?.enabled) {
    return (
      <div className={`daily-tasks panel p-6 ${className}`.trim()}>
        <p className="section-label mb-2">Daily Tasks</p>
        <h2 className="font-display text-xl text-gold">デイリータスク</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-muted">
          CP 機能は Supabase 設定後に利用できます。管理者は `scripts/supabase-cp.sql` を SQL Editor で実行してください。
        </p>
      </div>
    );
  }

  const completedCount = state.completedTaskIds.length;
  const allDone = completedCount >= state.tasks.length;

  return (
    <div className={`daily-tasks panel p-6 md:p-8 ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label mb-2">Daily Tasks</p>
          <h2 className="font-display text-xl text-gold md:text-2xl">デイリータスク</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream-muted">
            無料ガチャ → Xシェア → 予定表チェック。全クリアで{" "}
            <strong className="text-cream">{CP_DAILY_TASK_TOTAL} CP</strong>。
          </p>
        </div>
        <div className="cp-balance-badge shrink-0" aria-label={`所持 CP ${balance}`}>
          <span className="cp-balance-badge__label">所持 CP</span>
          <span className="cp-balance-badge__value">{balance}</span>
        </div>
      </div>

      <ul className="daily-tasks__list mt-6 space-y-3">
        {state.tasks.map((task) => (
          <li key={task.id}>
            <div
              className={`daily-tasks__item ${task.completed ? "daily-tasks__item--done" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-serif-jp text-sm text-cream">{task.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-cream-faint">{task.description}</p>
              </div>
              <div className="daily-tasks__item-meta shrink-0 text-right">
                <TaskAction task={task} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-cream-faint" role="status">
        {allDone
          ? "本日のデイリータスクはすべて達成済みです。"
          : `達成 ${completedCount} / ${state.tasks.length}`}
      </p>

      {showGachaHint && (
        <p className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs leading-relaxed text-cream-faint">
          無料ガチャ 1回/日 + CP追加（1回 {CP_GACHA_SINGLE_COST} CP / 10連 {CP_GACHA_TEN_COST} CP）
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
