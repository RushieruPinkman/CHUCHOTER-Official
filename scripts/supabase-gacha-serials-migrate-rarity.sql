-- gacha_serials の rarity 制約を「4〜6」に更新するマイグレーション
-- エラー 23514 が出た場合: rarity が 4 未満の古い行が残っています
-- Supabase SQL Editor でこのファイルを上から順に実行してください

-- 1. 現状確認（任意）
select rarity, status, count(*) as cnt
from public.gacha_serials
group by rarity, status
order by rarity, status;

-- 2. 新制約に合わない行を削除（★4 未満は旧仕様のため不要）
delete from public.gacha_serials
where rarity < 4 or rarity > 6;

-- 3. 制約を差し替え
alter table public.gacha_serials drop constraint if exists gacha_serials_rarity_check;

alter table public.gacha_serials
  add constraint gacha_serials_rarity_check check (rarity between 4 and 6);

-- 4. 使用済みシリアル自動削除関数（未作成の場合）
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
