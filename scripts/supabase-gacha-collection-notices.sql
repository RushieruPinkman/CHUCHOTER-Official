-- 住人削除時のコレクション振り分け通知
-- supabase-gacha-collection.sql 実行後に追加してください

create table if not exists public.user_gacha_collection_notices (
  user_key text not null,
  notice_id text not null,
  notice jsonb not null,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz,
  primary key (user_key, notice_id)
);

create index if not exists user_gacha_collection_notices_pending_idx
  on public.user_gacha_collection_notices (user_key, created_at desc)
  where dismissed_at is null;

alter table public.user_gacha_collection_notices enable row level security;

grant all on public.user_gacha_collection_notices to service_role;

drop policy if exists "No public access on user_gacha_collection_notices" on public.user_gacha_collection_notices;
create policy "No public access on user_gacha_collection_notices"
  on public.user_gacha_collection_notices for all to anon, authenticated
  using (false) with check (false);
