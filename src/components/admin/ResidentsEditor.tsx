"use client";

import { useEffect, useMemo, useState } from "react";
import { readApiError } from "@/lib/api-error";
import CastRoleBadge from "@/components/CastRoleBadge";
import { normalizeCastRole } from "@/lib/cast-roles";
import type { Cast } from "@/types";

type GenderFilter = "all" | "male" | "female";
type SortMode = "order" | "name";

const GENDER_LABELS: Record<Cast["gender"], string> = {
  female: "女性",
  male: "男性",
};

interface ResidentsEditorProps {
  casts: Cast[];
  authJsonHeaders: () => HeadersInit;
  onReload: () => void;
  onMessage: (message: string) => void;
  onEdit: (cast: Cast) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export default function ResidentsEditor({
  casts,
  authJsonHeaders,
  onReload,
  onMessage,
  onEdit,
  onAdd,
  onDelete,
}: ResidentsEditorProps) {
  const [localCasts, setLocalCasts] = useState(casts);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("order");
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    setLocalCasts(casts);
  }, [casts]);

  const canReorder =
    genderFilter === "all" && sortMode === "order" && search.trim() === "" && !savingOrder;

  const filteredCasts = useMemo(() => {
    let list = [...localCasts];

    if (genderFilter !== "all") {
      list = list.filter((cast) => (cast.gender ?? "female") === genderFilter);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter(
        (cast) =>
          cast.name.toLowerCase().includes(query) ||
          cast.nameEn.toLowerCase().includes(query) ||
          cast.tagline.toLowerCase().includes(query)
      );
    }

    if (sortMode === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    } else {
      list.sort((a, b) => a.order - b.order);
    }

    return list;
  }, [localCasts, genderFilter, search, sortMode]);

  const counts = useMemo(
    () => ({
      all: localCasts.length,
      male: localCasts.filter((cast) => (cast.gender ?? "female") === "male").length,
      female: localCasts.filter((cast) => (cast.gender ?? "female") === "female").length,
      active: localCasts.filter((cast) => cast.active).length,
    }),
    [localCasts]
  );

  const persistOrder = async (ordered: Cast[]) => {
    setSavingOrder(true);
    const previous = localCasts;
    setLocalCasts(ordered);

    try {
      const res = await fetch("/api/casts", {
        method: "PATCH",
        headers: authJsonHeaders(),
        body: JSON.stringify({ reorder: ordered.map((cast) => cast.id) }),
      });

      if (res.ok) {
        onMessage("表示順を更新しました");
        onReload();
      } else {
        setLocalCasts(previous);
        onMessage(await readApiError(res, "表示順の保存に失敗しました"));
      }
    } catch {
      setLocalCasts(previous);
      onMessage("表示順の保存に失敗しました");
    } finally {
      setSavingOrder(false);
    }
  };

  const reorderCasts = (fromId: string, toId: string) => {
    if (!canReorder || fromId === toId) return;

    const ordered = [...localCasts].sort((a, b) => a.order - b.order);
    const fromIndex = ordered.findIndex((cast) => cast.id === fromId);
    const toIndex = ordered.findIndex((cast) => cast.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);

    void persistOrder(ordered.map((cast, index) => ({ ...cast, order: index + 1 })));
  };

  const handleToggleActive = async (cast: Cast) => {
    try {
      const res = await fetch("/api/casts", {
        method: "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify({ ...cast, active: !cast.active }),
      });

      if (res.ok) {
        onMessage(cast.active ? "非公開にしました" : "公開しました");
        onReload();
      } else {
        onMessage(await readApiError(res, "公開設定の更新に失敗しました"));
      }
    } catch {
      onMessage("公開設定の更新に失敗しました");
    }
  };

  const handleDuplicate = async (cast: Cast) => {
    if (!confirm(`「${cast.name}」を複製しますか？`)) return;

    const ordered = [...localCasts].sort((a, b) => a.order - b.order);
    const payload = {
      name: `${cast.name}（複製）`,
      nameEn: cast.nameEn,
      role: normalizeCastRole(cast.role),
      gender: cast.gender ?? "female",
      tagline: cast.tagline,
      bio: cast.bio,
      image: cast.image,
      voiceUrl: cast.voiceUrl,
      xUrl: cast.xUrl,
      vrchatUrl: cast.vrchatUrl,
      order: ordered.length + 1,
      active: false,
    };

    try {
      const res = await fetch("/api/casts", {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onMessage("住人を複製しました（非公開で追加）");
        onReload();
      } else {
        onMessage(await readApiError(res, "複製に失敗しました"));
      }
    } catch {
      onMessage("複製に失敗しました");
    }
  };

  return (
    <section className="panel p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg text-gold">住民管理</h2>
          <p className="mt-1 text-xs text-cream-faint">
            公開 {counts.active} / 全 {counts.all}（男性 {counts.male} · 女性 {counts.female}）
          </p>
        </div>
        <button type="button" onClick={onAdd} className="btn-primary text-sm">
          + 新規追加
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前・コンセプトで検索"
          className="min-w-[200px] flex-1 border border-[var(--color-border)] bg-deep px-3 py-2 text-sm text-cream focus:border-gold focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-cream-muted">
          <span>並び</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="border border-[var(--color-border)] bg-deep px-2 py-2 text-sm text-cream focus:border-gold focus:outline-none"
          >
            <option value="order">表示順</option>
            <option value="name">名前順</option>
          </select>
        </label>
      </div>

      <div
        className="mb-4 flex flex-wrap gap-1 border border-[var(--color-border)] p-1"
        role="group"
        aria-label="性別で絞り込み"
      >
        {(
          [
            ["all", `すべて (${counts.all})`],
            ["female", `女性 (${counts.female})`],
            ["male", `男性 (${counts.male})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setGenderFilter(value)}
            className={`px-3 py-2 text-xs tracking-[0.08em] transition-colors md:text-sm ${
              genderFilter === value
                ? "bg-gold/15 text-gold"
                : "text-cream-muted hover:text-gold"
            }`}
            aria-pressed={genderFilter === value}
          >
            {label}
          </button>
        ))}
      </div>

      {!canReorder && (
        <p className="mb-4 text-xs text-cream-faint">
          ドラッグ並び替えは「すべて」「表示順」かつ検索なしのときのみ利用できます。
        </p>
      )}

      {filteredCasts.length === 0 ? (
        <p className="py-8 text-center text-sm text-cream-muted">該当する住人がいません。</p>
      ) : (
        <ul className="space-y-2">
          {filteredCasts.map((cast) => {
            const isDragging = dragId === cast.id;
            const isDropTarget = dropTargetId === cast.id && dragId !== cast.id;

            return (
              <li
                key={cast.id}
                draggable={canReorder}
                onDragStart={() => {
                  if (!canReorder) return;
                  setDragId(cast.id);
                }}
                onDragOver={(e) => {
                  if (!canReorder || !dragId) return;
                  e.preventDefault();
                  setDropTargetId(cast.id);
                }}
                onDragLeave={() => {
                  if (dropTargetId === cast.id) setDropTargetId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) reorderCasts(dragId, cast.id);
                  setDragId(null);
                  setDropTargetId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTargetId(null);
                }}
                className={`flex flex-wrap items-center gap-3 border bg-deep/50 px-3 py-3 transition-colors md:px-4 ${
                  isDragging ? "opacity-50" : ""
                } ${
                  isDropTarget
                    ? "border-gold/60 bg-gold/5"
                    : "border-[var(--color-border)]"
                } ${canReorder ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                <div
                  className={`flex shrink-0 items-center gap-2 text-cream-faint ${canReorder ? "" : "opacity-40"}`}
                  aria-hidden={!canReorder}
                >
                  <span className="text-lg leading-none">⋮⋮</span>
                  <span className="w-5 text-center text-xs tabular-nums">{cast.order}</span>
                </div>

                <div className="h-14 w-10 shrink-0 overflow-hidden border border-[var(--color-border)] bg-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cast.image}
                    alt=""
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-cream">{cast.name}</span>
                    <span className="text-xs text-cream-muted">{cast.nameEn}</span>
                    <CastRoleBadge role={cast.role} className="text-[10px]" />
                    <span className="border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-cream-faint">
                      {GENDER_LABELS[cast.gender ?? "female"]}
                    </span>
                    <span
                      className={`text-[10px] ${cast.active ? "text-gold" : "text-cream-faint"}`}
                    >
                      {cast.active ? "公開中" : "非公開"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-cream-faint">{cast.tagline}</p>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(cast)}
                    className="text-xs text-cream-muted hover:text-gold"
                  >
                    {cast.active ? "非公開にする" : "公開する"}
                  </button>
                  <a
                    href={`/casts?cast=${cast.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cream-muted hover:text-gold"
                  >
                    プレビュー
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(cast)}
                    className="text-xs text-cream-muted hover:text-gold"
                  >
                    複製
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onEdit({
                        ...cast,
                        gender: cast.gender ?? "female",
                        role: normalizeCastRole(cast.role),
                      })
                    }
                    className="text-sm text-gold hover:underline"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(cast.id)}
                    className="text-sm text-cream-muted hover:text-red-400"
                  >
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {savingOrder && (
        <p className="mt-4 text-xs text-cream-muted">表示順を保存しています…</p>
      )}
    </section>
  );
}
