-- ガチャコレクション・抽選履歴（端末をまたいで保持）
-- supabase-cp.sql 実行後に追加してください

create table if not exists public.user_gacha_collections (
  user_key text primary key,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_gacha_draw_history (
  user_key text not null,
  record_id text not null,
  result jsonb not null,
  won_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_key, record_id)
);

create index if not exists user_gacha_draw_history_user_won_at_idx
  on public.user_gacha_draw_history (user_key, won_at desc);

alter table public.user_gacha_collections enable row level security;
alter table public.user_gacha_draw_history enable row level security;

grant all on public.user_gacha_collections to service_role;
grant all on public.user_gacha_draw_history to service_role;

drop policy if exists "No public access on user_gacha_collections" on public.user_gacha_collections;
create policy "No public access on user_gacha_collections"
  on public.user_gacha_collections for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No public access on user_gacha_draw_history" on public.user_gacha_draw_history;
create policy "No public access on user_gacha_draw_history"
  on public.user_gacha_draw_history for all to anon, authenticated
  using (false) with check (false);
