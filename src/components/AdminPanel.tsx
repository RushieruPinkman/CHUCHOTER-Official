"use client";

import { useCallback, useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import ImageUploader from "@/components/admin/ImageUploader";
import VoiceUploader from "@/components/admin/VoiceUploader";
import ResidentsEditor from "@/components/admin/ResidentsEditor";
import ScheduleEditor from "@/components/admin/ScheduleEditor";
import GachaSerialAdmin from "@/components/admin/GachaSerialAdmin";
import DmAdmin from "@/components/admin/DmAdmin";
import { readApiError } from "@/lib/api-error";
import { CAST_ROLES, CAST_ROLE_LABELS, normalizeCastRole } from "@/lib/cast-roles";
import type { Announcement, Cast, CastRole, ScheduleEntry, SiteStatus } from "@/types";

type Tab = "announcements" | "residents" | "schedule" | "status" | "serials" | "dm";

const EMPTY_CAST: Omit<Cast, "id"> = {
  name: "",
  nameEn: "",
  role: "cast",
  gender: "female",
  tagline: "",
  bio: "",
  image: "/images/casts/placeholder.svg",
  order: 1,
  active: true,
};

const EMPTY_ANNOUNCEMENT: Omit<Announcement, "id"> = {
  title: "",
  body: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  active: true,
  pinned: false,
};

const inputClass =
  "w-full border border-[var(--color-border)] bg-deep px-3 py-2 text-cream focus:border-gold focus:outline-none";

export default function AdminPanel({
  readOnlyHost = false,
  remoteStorage = false,
  missingSupabaseEnv = [],
}: {
  readOnlyHost?: boolean;
  remoteStorage?: boolean;
  missingSupabaseEnv?: string[];
}) {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("announcements");
  const [casts, setCasts] = useState<Cast[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [editingCast, setEditingCast] = useState<Cast | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isNewCast, setIsNewCast] = useState(false);
  const [isNewAnnouncement, setIsNewAnnouncement] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [storageIssue, setStorageIssue] = useState<string | null>(null);

  const authGetHeaders = useCallback(
    (): HeadersInit => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const authJsonHeaders = useCallback(
    (): HeadersInit => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const checkStorage = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin/storage", { headers: authGetHeaders() });
      if (!res.ok) {
        setStorageIssue("ストレージ状態を確認できませんでした");
        return;
      }
      const body = (await res.json()) as {
        writable?: boolean;
        remoteStorage?: boolean;
        supabaseOk?: boolean;
        supabaseError?: string | null;
        missingEnv?: string[];
      };

      if (!body.writable) {
        const missing = body.missingEnv?.length ? `（${body.missingEnv.join(" / ")}）` : "";
        setStorageIssue(`Supabase が未設定のため、本番では保存できません${missing}`);
        return;
      }

      if (body.remoteStorage && !body.supabaseOk) {
        setStorageIssue(
          body.supabaseError
            ? `Supabase への接続に失敗: ${body.supabaseError}`
            : "Supabase への接続に失敗しました"
        );
        return;
      }

      setStorageIssue(null);
    } catch {
      setStorageIssue("ストレージ状態を確認できませんでした");
    }
  }, [token, authGetHeaders]);

  const ensureWritable = () => {
    if (readOnlyHost || storageIssue) {
      setMessage(storageIssue || "本番環境では Supabase の設定が必要です。");
      return false;
    }
    return true;
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [castsRes, announceRes, scheduleRes, statusRes] = await Promise.all([
        fetch("/api/casts", { headers: authGetHeaders() }),
        fetch("/api/announcements", { headers: authGetHeaders() }),
        fetch("/api/schedule", { headers: authGetHeaders() }),
        fetch("/api/status"),
      ]);
      if (castsRes.ok) setCasts(await castsRes.json());
      if (announceRes.ok) setAnnouncements(await announceRes.json());
      if (scheduleRes.ok) setSchedule(await scheduleRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
      await checkStorage();
    } catch {
      setMessage("データの読み込みに失敗しました。開発サーバーを確認して再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  }, [token, authGetHeaders, checkStorage]);

  useEffect(() => {
    const saved = sessionStorage.getItem("chuchoter-admin-token");
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const { token: t } = await res.json();
        setToken(t);
        sessionStorage.setItem("chuchoter-admin-token", t);
        setMessage("ログインしました");
      } else {
        setMessage("パスワードが正しくありません");
      }
    } catch {
      setMessage("サーバーに接続できません。開発サーバーが起動しているか確認してください。");
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem("chuchoter-admin-token");
  };

  const handleSaveCast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCast || !token || !ensureWritable()) return;
    try {
      const payload = {
        ...editingCast,
        gender: editingCast.gender ?? "female",
        role: normalizeCastRole(editingCast.role),
      };
      const res = await fetch("/api/casts", {
        method: isNewCast ? "POST" : "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage(isNewCast ? "住人を追加しました" : "住人を更新しました");
        setEditingCast(null);
        setIsNewCast(false);
        loadData();
      } else {
        setMessage(await readApiError(res, "保存に失敗しました"));
      }
    } catch {
      setMessage("保存に失敗しました。サーバーへの接続を確認してください。");
    }
  };

  const handleDeleteCast = async (id: string) => {
    if (!token || !confirm("この住人を削除しますか？")) return;
    try {
      const res = await fetch(`/api/casts?id=${id}`, {
        method: "DELETE",
        headers: authGetHeaders(),
      });
      if (res.ok) {
        setMessage("住人を削除しました");
        loadData();
      }
    } catch {
      setMessage("削除に失敗しました。サーバーへの接続を確認してください。");
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !token || !ensureWritable()) return;
    try {
      const res = await fetch("/api/announcements", {
        method: isNewAnnouncement ? "POST" : "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify(editingAnnouncement),
      });
      if (res.ok) {
        setMessage(isNewAnnouncement ? "お知らせを追加しました" : "お知らせを更新しました");
        setEditingAnnouncement(null);
        setIsNewAnnouncement(false);
        loadData();
      } else {
        setMessage(await readApiError(res, "保存に失敗しました"));
      }
    } catch {
      setMessage("保存に失敗しました。サーバーへの接続を確認してください。");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!token || !confirm("このお知らせを削除しますか？")) return;
    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: "DELETE",
        headers: authGetHeaders(),
      });
      if (res.ok) {
        setMessage("お知らせを削除しました");
        loadData();
      }
    } catch {
      setMessage("削除に失敗しました。サーバーへの接続を確認してください。");
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status || !token || !ensureWritable()) return;
    try {
      const res = await fetch("/api/status", {
        method: "PATCH",
        headers: authJsonHeaders(),
        body: JSON.stringify(status),
      });
      if (res.ok) setMessage("運行状況を更新しました");
      else setMessage(await readApiError(res, "運行状況の保存に失敗しました"));
    } catch {
      setMessage("運行状況の保存に失敗しました。サーバーへの接続を確認してください。");
    }
  };

  const handleSaveSchedule = async (entries: ScheduleEntry[]) => {
    if (!token || !ensureWritable()) return false;
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: authJsonHeaders(),
        body: JSON.stringify(entries),
      });
      if (res.ok) {
        setMessage("予定表を保存しました");
        setSchedule(entries);
        return true;
      }
      setMessage(await readApiError(res, "予定表の保存に失敗しました"));
      return false;
    } catch {
      setMessage("予定表の保存に失敗しました。サーバーへの接続を確認してください。");
      return false;
    }
  };

  if (!token) {
    return (
      <>
        <AdminHeader />
        <div className="flex min-h-[60svh] items-center justify-center px-4 py-10">
          <form onSubmit={handleLogin} className="panel w-full max-w-md p-8 md:p-10">
            <h1 className="section-title mb-6 text-xl">管理者ログイン</h1>
          <label htmlFor="password" className="mb-2 block text-sm text-cream-muted">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mb-6 ${inputClass}`}
            required
          />
          <button type="submit" className="btn-primary w-full">
            ログイン
          </button>
          {message && <p className="mt-4 text-sm text-cream-muted">{message}</p>}
          <p className="mt-6 text-[11px] text-cream-faint">
            パスワードは data/settings.json で変更できます
          </p>
          </form>
        </div>
      </>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "announcements", label: "お知らせ" },
    { id: "residents", label: "住民" },
    { id: "schedule", label: "予定表" },
    { id: "status", label: "運行状況" },
    { id: "serials", label: "シリアル" },
    { id: "dm", label: "DM" },
  ];

  return (
    <>
      <AdminHeader
        trailing={
          <button type="button" onClick={handleLogout} className="btn-ghost text-sm">
            ログアウト
          </button>
        }
      />
      <div className="site-container py-8 md:py-10">

      {remoteStorage && !storageIssue && (
        <p className="panel mb-6 border-gold/30 px-4 py-3 text-sm leading-relaxed text-cream-muted">
          オンラインストレージに接続済みです。保存内容は本番サイトに即時反映されます。
        </p>
      )}

      {(readOnlyHost || storageIssue) && (
        <div className="panel mb-6 space-y-3 border-red-400/40 bg-red-950/20 px-4 py-3 text-sm leading-relaxed text-cream-muted">
          <p className="text-red-300">
            {storageIssue || "Supabase が未設定のため、本番では保存できません。"}
          </p>
          {missingSupabaseEnv.length > 0 && (
            <p>
              Vercel → プロジェクト → <strong className="text-cream">Settings → Environment Variables</strong>
              に次を追加してください:
              <br />
              <code className="text-gold">{missingSupabaseEnv.join(" / ")}</code>
            </p>
          )}
          <ol className="list-decimal space-y-1 pl-5">
            <li>Supabase で SQL（scripts/supabase-setup.sql）を実行済みか確認</li>
            <li>Supabase → Settings → API から URL と service_role キーをコピー</li>
            <li>Vercel に環境変数を追加後、Deployments → Redeploy（キャッシュ OFF）</li>
          </ol>
        </div>
      )}

      {message && (
        <p className="panel mb-6 border-gold/30 px-4 py-3 text-sm text-gold">{message}</p>
      )}

      <nav className="mb-8 flex flex-wrap gap-px" aria-label="管理メニュー">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border border-[var(--color-border)] px-5 py-2.5 text-sm transition-colors ${
              tab === t.id ? "bg-gold/10 text-gold" : "bg-surface text-cream-muted hover:text-gold"
            }`}
            aria-current={tab === t.id ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loading && <p className="mb-4 text-sm text-cream-muted">読み込み中...</p>}

      {tab === "announcements" && (
        <section className="panel p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg text-gold">お知らせ管理</h2>
            <button
              type="button"
              onClick={() => {
                setIsNewAnnouncement(true);
                setEditingAnnouncement({ ...EMPTY_ANNOUNCEMENT, id: "" } as Announcement);
              }}
              className="btn-primary text-sm"
            >
              + 新規追加
            </button>
          </div>
          <ul className="space-y-3">
            {announcements.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 border border-[var(--color-border)] bg-deep/50 px-4 py-3"
              >
                <div>
                  <p className="text-cream">{item.title}</p>
                  <p className="mt-1 text-xs text-cream-faint">
                    {item.publishedAt}
                    {item.pinned ? " · 固定" : ""}
                    {item.active ? "" : " · 非公開"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewAnnouncement(false);
                      setEditingAnnouncement(item);
                    }}
                    className="text-sm text-gold hover:underline"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(item.id)}
                    className="text-sm text-cream-muted hover:text-red-400"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "residents" && token && (
        <ResidentsEditor
          casts={casts}
          authJsonHeaders={authJsonHeaders}
          onReload={loadData}
          onMessage={setMessage}
          onEdit={(cast) => {
            setIsNewCast(false);
            setEditingCast(cast);
          }}
          onAdd={() => {
            setIsNewCast(true);
            setEditingCast({
              ...EMPTY_CAST,
              id: "",
              order: casts.length + 1,
            } as Cast);
          }}
          onDelete={handleDeleteCast}
        />
      )}

      {tab === "schedule" && token && (
        <ScheduleEditor
          schedule={schedule}
          casts={casts}
          onSave={handleSaveSchedule}
        />
      )}

      {tab === "status" && status && (
        <section className="panel p-6 md:p-8">
          <h2 className="mb-4 text-lg text-gold">本日の運行状況</h2>
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={status.isOpen}
                onChange={(e) =>
                  setStatus({
                    ...status,
                    isOpen: e.target.checked,
                    message: e.target.checked ? "本日営業" : "Close",
                  })
                }
                className="accent-gold"
              />
              <span>営業中</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm text-cream-muted">1部</span>
                <input
                  value={status.part1}
                  onChange={(e) => setStatus({ ...status, part1: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm text-cream-muted">2部</span>
                <input
                  value={status.part2}
                  onChange={(e) => setStatus({ ...status, part2: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>
            <button type="submit" className="btn-primary text-sm">
              運行状況を保存
            </button>
          </form>
        </section>
      )}

      {tab === "serials" && token && (
        <GachaSerialAdmin authJsonHeaders={authJsonHeaders} remoteStorage={remoteStorage} />
      )}

      {tab === "dm" && token && (
        <DmAdmin authJsonHeaders={authJsonHeaders} remoteStorage={remoteStorage} />
      )}

      {editingCast && token && (
        <Modal title={isNewCast ? "住人を追加" : "住人を編集"} onClose={() => { setEditingCast(null); setIsNewCast(false); }} wide>
          <form onSubmit={handleSaveCast} className="space-y-3">
            <ImageUploader
              value={editingCast.image}
              onChange={(url) => setEditingCast({ ...editingCast, image: url })}
              authToken={token}
            />
            <VoiceUploader
              value={editingCast.voiceUrl}
              onChange={(voiceUrl) => setEditingCast({ ...editingCast, voiceUrl })}
              authToken={token}
            />
            {(
              [
                ["name", "名前（日本語）", "text"],
                ["nameEn", "名前（英語）", "text"],
                ["tagline", "コンセプト", "text"],
                ["bio", "皆様へ一言", "textarea"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-sm text-cream-muted">{label}</span>
                {type === "textarea" ? (
                  <textarea
                    value={editingCast[key]}
                    onChange={(e) => setEditingCast({ ...editingCast, [key]: e.target.value })}
                    rows={4}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type={type}
                    value={editingCast[key] ?? ""}
                    onChange={(e) =>
                      setEditingCast({
                        ...editingCast,
                        [key]: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                )}
              </label>
            ))}
            {!isNewCast && (
              <p className="text-xs text-cream-faint">
                表示順は一覧のドラッグ操作で変更できます（現在: {editingCast.order} 番目）
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-sm text-cream-muted">ロール</span>
              <select
                value={normalizeCastRole(editingCast.role)}
                onChange={(e) =>
                  setEditingCast({
                    ...editingCast,
                    role: e.target.value as CastRole,
                  })
                }
                className={inputClass}
              >
                {CAST_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {CAST_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-cream-muted">性別</span>
              <select
                value={editingCast.gender}
                onChange={(e) =>
                  setEditingCast({
                    ...editingCast,
                    gender: e.target.value as Cast["gender"],
                  })
                }
                className={inputClass}
              >
                <option value="female">女性</option>
                <option value="male">男性</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingCast.active}
                onChange={(e) => setEditingCast({ ...editingCast, active: e.target.checked })}
                className="accent-gold"
              />
              <span className="text-sm">公開する</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">保存</button>
              <button type="button" onClick={() => { setEditingCast(null); setIsNewCast(false); }} className="text-cream-muted">キャンセル</button>
            </div>
          </form>
        </Modal>
      )}

      {editingAnnouncement && (
        <Modal
          title={isNewAnnouncement ? "お知らせを追加" : "お知らせを編集"}
          onClose={() => { setEditingAnnouncement(null); setIsNewAnnouncement(false); }}
        >
          <form onSubmit={handleSaveAnnouncement} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-cream-muted">タイトル</span>
              <input
                value={editingAnnouncement.title}
                onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-cream-muted">本文</span>
              <textarea
                value={editingAnnouncement.body}
                onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, body: e.target.value })}
                rows={5}
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-cream-muted">公開日</span>
              <input
                type="date"
                value={editingAnnouncement.publishedAt}
                onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, publishedAt: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingAnnouncement.pinned}
                onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, pinned: e.target.checked })}
                className="accent-gold"
              />
              <span className="text-sm">固定表示（PIN）</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingAnnouncement.active}
                onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, active: e.target.checked })}
                className="accent-gold"
              />
              <span className="text-sm">公開する</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">保存</button>
              <button type="button" onClick={() => { setEditingAnnouncement(null); setIsNewAnnouncement(false); }} className="text-cream-muted">キャンセル</button>
            </div>
          </form>
        </Modal>
      )}
      </div>
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className={`panel max-h-[90vh] w-full overflow-y-auto p-6 md:p-8 ${wide ? "max-w-xl" : "max-w-lg"}`}
        data-lenis-prevent
      >
        <h3 className="mb-4 text-lg text-gold">{title}</h3>
        {children}
        <button type="button" onClick={onClose} className="sr-only">
          閉じる
        </button>
      </div>
    </div>
  );
}
