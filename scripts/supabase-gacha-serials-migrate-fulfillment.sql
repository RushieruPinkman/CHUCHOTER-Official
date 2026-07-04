-- ガチャ景品の待機・自動配信追跡（Supabase SQL Editor で実行）
-- supabase-gacha-serials.sql 実行後に追加してください

alter table public.gacha_serials
  add column if not exists cast_id text,
  add column if not exists dm_thread_id text,
  add column if not exists fulfillment_status text
    check (fulfillment_status is null or fulfillment_status in ('pending', 'fulfilled'));

create index if not exists gacha_serials_pending_fulfillment_idx
  on public.gacha_serials (cast_id, rarity, fulfillment_status)
  where fulfillment_status = 'pending';
