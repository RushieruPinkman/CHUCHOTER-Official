-- ガチャ当選報告用シリアル（Supabase SQL Editor で実行）
-- supabase-setup.sql 実行後に追加してください

create table if not exists public.gacha_serials (
  serial text primary key,
  status text not null default 'issued' check (status in ('issued', 'used')),
  rarity smallint not null check (rarity between 2 and 6),
  source text not null check (source in ('draw', 'exchange')),
  won_at timestamptz not null,
  user_key text not null,
  prize_title text not null,
  prize_subtitle text,
  cast_name text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gacha_serials_user_key_idx on public.gacha_serials (user_key);
create index if not exists gacha_serials_status_idx on public.gacha_serials (status);
create index if not exists gacha_serials_won_at_idx on public.gacha_serials (won_at desc);

alter table public.gacha_serials enable row level security;

grant all on public.gacha_serials to service_role;

drop policy if exists "No public access on gacha_serials" on public.gacha_serials;
create policy "No public access on gacha_serials"
  on public.gacha_serials
  for all
  to anon, authenticated
  using (false)
  with check (false);
