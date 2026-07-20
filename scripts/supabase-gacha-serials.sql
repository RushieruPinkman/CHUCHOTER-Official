-- ガチャ当選報告用シリアル（Supabase SQL Editor で実行）
-- supabase-setup.sql 実行後に追加してください

create table if not exists public.gacha_serials (
  serial text primary key,
  status text not null default 'issued' check (status in ('issued', 'used')),
  rarity smallint not null check (rarity between 4 and 6),
  source text not null check (source in ('draw', 'exchange')),
  won_at timestamptz not null,
  user_key text not null,
  prize_title text not null,
  prize_subtitle text,
  cast_name text,
  cast_id text,
  dm_thread_id text,
  fulfillment_status text check (fulfillment_status is null or fulfillment_status in ('pending', 'fulfilled')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gacha_serials_user_key_idx on public.gacha_serials (user_key);
create index if not exists gacha_serials_status_idx on public.gacha_serials (status);
create index if not exists gacha_serials_won_at_idx on public.gacha_serials (won_at desc);
create index if not exists gacha_serials_pending_fulfillment_idx
  on public.gacha_serials (cast_id, rarity, fulfillment_status)
  where fulfillment_status = 'pending';

alter table public.gacha_serials enable row level security;

grant all on public.gacha_serials to service_role;

drop policy if exists "No public access on gacha_serials" on public.gacha_serials;
create policy "No public access on gacha_serials"
  on public.gacha_serials
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- 未使用・使用済みシリアルの自動削除関数（参考用・現行アプリでは無効）
-- アプリ側で purge を呼ばないため、pg_cron でスケジュールしないでください。
create or replace function public.purge_expired_gacha_serials(retention_days int default 30)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.gacha_serials
  where status = 'issued'
    and created_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.purge_expired_gacha_serials(int) to service_role;

-- 使用済みシリアルの自動削除関数（参考用・現行アプリでは無効）
create or replace function public.purge_expired_used_gacha_serials(retention_days int default 90)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.gacha_serials
  where status = 'used'
    and used_at is not null
    and used_at < now() - make_interval(days => retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.purge_expired_used_gacha_serials(int) to service_role;

-- 既存テーブルがある場合（★4 対応）:
-- scripts/supabase-gacha-serials-migrate-rarity.sql を実行してください。
-- （rarity < 4 の古い行を削除してから制約を更新します）
--
-- pg_cron は使用しないでください（現行アプリではシリアル自動削除は無効）。
