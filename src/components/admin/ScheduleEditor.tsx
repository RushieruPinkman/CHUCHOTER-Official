"use client";

import { useState } from "react";
import type { Cast, ScheduleEntry } from "@/types";
import { formatJapaneseDate } from "@/lib/site";

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2 text-cream focus:border-gold focus:outline-none";

const EMPTY_ENTRY: ScheduleEntry = {
  id: "",
  date: new Date().toISOString().slice(0, 10),
  status: "open",
  part1Casts: [],
  part2Casts: [],
  note: "",
};

interface ScheduleEditorProps {
  schedule: ScheduleEntry[];
  casts: Cast[];
  onSave: (entries: ScheduleEntry[]) => Promise<boolean>;
}

export default function ScheduleEditor({
  schedule,
  casts,
  onSave,
}: ScheduleEditorProps) {
  const [entries, setEntries] = useState(schedule);
  const [editing, setEditing] = useState<ScheduleEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleCast = (
    entry: ScheduleEntry,
    part: "part1Casts" | "part2Casts",
    castId: string
  ) => {
    const list = entry[part];
    const next = list.includes(castId)
      ? list.filter((id) => id !== castId)
      : [...list, castId];
    return { ...entry, [part]: next };
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const entry = {
      ...editing,
      id: editing.id || editing.date,
    };

    const next = isNew
      ? [...entries, entry]
      : entries.map((item) => (item.id === entry.id ? entry : item));

    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);

    if (ok) {
      setEntries(next);
      setEditing(null);
      setIsNew(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この予定を削除しますか？")) return;
    const next = entries.filter((e) => e.id !== id);
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    if (ok) setEntries(next);
  };

  return (
    <section className="panel p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg text-gold">予定表管理</h2>
        <button
          type="button"
          onClick={() => {
            setIsNew(true);
            setEditing({ ...EMPTY_ENTRY });
          }}
          className="btn-primary text-sm"
        >
          + 予定を追加
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {["日付", "状態", "1部", "2部", "操作"].map((h) => (
                <th key={h} className="px-3 py-3 text-[11px] font-normal tracking-wider text-gold uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...entries]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--color-border)]/50">
                  <td className="px-3 py-3 text-cream">{formatJapaneseDate(entry.date)}</td>
                  <td className="px-3 py-3 text-cream-muted">{entry.status}</td>
                  <td className="px-3 py-3 text-cream-muted">
                    {entry.part1Casts.map((id) => casts.find((c) => c.id === id)?.name ?? id).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-cream-muted">
                    {entry.part2Casts.map((id) => casts.find((c) => c.id === id)?.name ?? id).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNew(false);
                          setEditing(entry);
                        }}
                        className="text-gold hover:underline"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-cream-muted hover:text-red-400"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleSaveEntry}
            className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 md:p-8"
            data-lenis-prevent
          >
            <h3 className="mb-4 text-lg text-gold">
              {isNew ? "予定を追加" : "予定を編集"}
            </h3>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm text-cream-muted">日付</span>
              <input
                type="date"
                value={editing.date}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value, id: e.target.value })
                }
                className={inputClass}
                required
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm text-cream-muted">状態</span>
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as ScheduleEntry["status"],
                  })
                }
                className={inputClass}
              >
                <option value="open">営業</option>
                <option value="closed">休業</option>
                <option value="special">特別</option>
              </select>
            </label>

            {(["part1Casts", "part2Casts"] as const).map((part) => (
              <fieldset key={part} className="mb-4 border border-[var(--color-border)] p-3">
                <legend className="px-1 text-sm text-cream-muted">
                  {part === "part1Casts" ? "1部（20:50〜）" : "2部（22:00〜）"}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {casts.filter((c) => c.active).map((cast) => (
                    <label
                      key={cast.id}
                      className={`cursor-pointer border px-3 py-1 text-xs ${
                        editing[part].includes(cast.id)
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-[var(--color-border)] text-cream-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={editing[part].includes(cast.id)}
                        onChange={() => setEditing(toggleCast(editing, part, cast.id))}
                      />
                      {cast.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <label className="mb-4 block">
              <span className="mb-1 block text-sm text-cream-muted">備考</span>
              <input
                value={editing.note ?? ""}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                className={inputClass}
                placeholder="定休日、特別営業など"
              />
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setIsNew(false);
                }}
                className="text-cream-muted"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
