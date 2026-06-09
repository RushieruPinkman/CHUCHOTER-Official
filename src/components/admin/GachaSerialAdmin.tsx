"use client";

import { useCallback, useMemo, useState } from "react";
import { readApiError } from "@/lib/api-error";
import {
  formatGachaHistoryTimestamp,
} from "@/lib/gacha-history";
import {
  getGachaSerialStatusLabel,
  isValidGachaSerialNumber,
  normalizeGachaSerialNumber,
  type GachaSerialPublicRecord,
} from "@/lib/gacha-serial";
import { getRarityLabel } from "@/lib/gacha";

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2 font-mono text-sm text-cream focus:border-gold focus:outline-none";

interface GachaSerialAdminProps {
  authJsonHeaders: () => HeadersInit;
  remoteStorage: boolean;
}

export default function GachaSerialAdmin({
  authJsonHeaders,
  remoteStorage,
}: GachaSerialAdminProps) {
  const [serialInput, setSerialInput] = useState("");
  const [record, setRecord] = useState<GachaSerialPublicRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<GachaSerialPublicRecord[]>([]);
  const [lookupHistory, setLookupHistory] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const duplicateLookup = useMemo(() => {
    const normalized = normalizeGachaSerialNumber(serialInput);
    if (!normalized) return false;
    return lookupHistory.includes(normalized);
  }, [lookupHistory, serialInput]);

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gacha-serials", { headers: authJsonHeaders() });
      if (!res.ok) return;
      const body = (await res.json()) as { records?: GachaSerialPublicRecord[] };
      setRecentRecords(body.records ?? []);
    } catch {
      /* ignore */
    }
  }, [authJsonHeaders]);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setWarning(null);

    const normalized = normalizeGachaSerialNumber(serialInput);
    if (!normalized) {
      setMessage("シリアルNo.を入力してください。");
      return;
    }
    if (!isValidGachaSerialNumber(normalized)) {
      setMessage("シリアルNo.の形式が正しくありません。");
      return;
    }

    if (lookupHistory.includes(normalized)) {
      setWarning("このシリアルNo.は、すでに管理画面で確認済みです。");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/gacha-serials", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ serial: normalized, action: "lookup" }),
      });

      if (!res.ok) {
        setRecord(null);
        setMessage(await readApiError(res, "シリアルNo.の確認に失敗しました"));
        return;
      }

      const body = (await res.json()) as { record: GachaSerialPublicRecord };
      setRecord(body.record);
      if (body.record.status === "used") {
        setWarning("このシリアルNo.はすでに使用済みです。");
      }
      setLookupHistory((current) =>
        current.includes(normalized) ? current : [...current, normalized]
      );
      setMessage("シリアルNo.を確認しました。");
      void loadRecent();
    } catch {
      setMessage("シリアルNo.の確認に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUsed = async () => {
    const normalized = normalizeGachaSerialNumber(serialInput);
    if (!normalized || !isValidGachaSerialNumber(normalized)) {
      setMessage("先に有効なシリアルNo.を確認してください。");
      return;
    }

    if (record?.status === "used") {
      setWarning("このシリアルNo.はすでに使用済みです。");
      return;
    }

    setLoading(true);
    setMessage(null);
    setWarning(null);

    try {
      const res = await fetch("/api/admin/gacha-serials", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ serial: normalized, action: "mark_used" }),
      });

      if (!res.ok) {
        setMessage(await readApiError(res, "使用済みへの更新に失敗しました"));
        return;
      }

      const body = (await res.json()) as {
        record: GachaSerialPublicRecord;
        alreadyUsed?: boolean;
      };

      setRecord(body.record);
      if (body.alreadyUsed) {
        setWarning("このシリアルNo.はすでに使用済みです。");
      } else {
        setMessage("使用済みに更新しました。ユーザー画面にも反映されます。");
      }
      void loadRecent();
    } catch {
      setMessage("使用済みへの更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  if (!remoteStorage) {
    return (
      <div className="panel p-6 text-sm leading-relaxed text-cream-muted">
        Supabase が未設定のため、シリアルNo.管理は利用できません。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 md:p-8">
        <p className="section-label mb-2">Gacha Serial</p>
        <h2 className="font-display text-xl text-gold md:text-2xl">当選シリアル確認</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream-muted">
          ユーザーから報告されたシリアルNo.を確認し、受け取り済みの場合は「使用済みにする」を押してください。
          同じシリアルを再度入力すると警告が表示されます。
        </p>

        <form onSubmit={handleLookup} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-serial-input" className="mb-1.5 block text-xs text-cream-muted">
              シリアルNo.
            </label>
            <input
              id="admin-serial-input"
              value={serialInput}
              onChange={(event) => setSerialInput(event.target.value)}
              className={inputClass}
              placeholder="CCT-aB3!k9M@xQ2#"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className="btn-primary min-h-11 px-6">
              {loading ? "確認中…" : "確認する"}
            </button>
            <button
              type="button"
              disabled={loading || !record}
              onClick={handleMarkUsed}
              className="btn-ghost min-h-11 px-6 disabled:opacity-40"
            >
              使用済みにする
            </button>
          </div>
        </form>

        {duplicateLookup && (
          <p className="mt-4 text-sm leading-relaxed text-amber-200/90" role="alert">
            このシリアルNo.は、すでに管理画面で確認済みです。
          </p>
        )}

        {warning && (
          <p className="mt-4 text-sm leading-relaxed text-amber-200/90" role="alert">
            {warning}
          </p>
        )}

        {message && (
          <p className="mt-4 text-sm leading-relaxed text-cream-muted" role="status">
            {message}
          </p>
        )}

        {record && (
          <dl className="mt-6 grid gap-4 border border-[var(--color-border)] bg-deep/60 p-5 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-cream-faint">シリアルNo.</dt>
              <dd className="mt-1 break-all font-mono text-gold">{record.serial}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-cream-faint">状態</dt>
              <dd className="mt-1 text-cream">{getGachaSerialStatusLabel(record.status)}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-cream-faint">レアリティ</dt>
              <dd className="mt-1 text-cream">{getRarityLabel(record.rarity)}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-cream-faint">景品</dt>
              <dd className="mt-1 text-cream">{record.prizeTitle}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-cream-faint">取得元</dt>
              <dd className="mt-1 text-cream">
                {record.source === "exchange" ? "コレクション交換" : "ガチャ抽選"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.12em] text-cream-faint">獲得日時</dt>
              <dd className="mt-1 text-cream">{formatGachaHistoryTimestamp(record.wonAt)}</dd>
            </div>
            {record.usedAt && (
              <div className="md:col-span-2">
                <dt className="text-[11px] tracking-[0.12em] text-cream-faint">使用済み日時</dt>
                <dd className="mt-1 text-cream">{formatGachaHistoryTimestamp(record.usedAt)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {recentRecords.length > 0 && (
        <div className="panel p-6 md:p-8">
          <h3 className="font-display text-lg text-gold">最近のシリアル</h3>
          <ul className="mt-4 space-y-3">
            {recentRecords.map((item) => (
              <li
                key={item.serial}
                className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-border)] bg-deep/60 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm text-gold">{item.serial}</p>
                  <p className="mt-1 text-xs text-cream-muted">
                    {getRarityLabel(item.rarity)} · {item.prizeTitle}
                  </p>
                </div>
                <span className="text-xs text-cream-faint">{getGachaSerialStatusLabel(item.status)}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void loadRecent()} className="btn-ghost mt-4 min-h-10 px-5 text-xs">
            一覧を更新
          </button>
        </div>
      )}

      {recentRecords.length === 0 && (
        <div className="text-center">
          <button type="button" onClick={() => void loadRecent()} className="btn-ghost min-h-10 px-5 text-xs">
            最近のシリアルを読み込む
          </button>
        </div>
      )}
    </div>
  );
}
