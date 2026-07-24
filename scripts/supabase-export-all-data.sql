-- CHUCHOTER / Supabase 全データ退避（1回実行 → CSV Export）
--
-- 使い方:
-- 1. SQL Editor にこのファイル全文を貼る
-- 2. Run
-- 3. 結果の Limit を No limit にする
-- 4. Export / Download CSV
--
-- 出力列:
--   table_name … テーブル名
--   data       … その行の全カラム（JSON）
--
-- 会員・CP・ガチャ・DM・プッシュなどユーザーデータも含まれます。
-- Storage（画像・音声ファイル）は別途 Dashboard → Storage からダウンロードしてください。

select 'auth.users'::text as table_name, to_jsonb(t) as data
from auth.users t

union all
select 'public.site_data', to_jsonb(t)
from public.site_data t

union all
select 'public.user_cp_balances', to_jsonb(t)
from public.user_cp_balances t

union all
select 'public.user_cp_ledger', to_jsonb(t)
from public.user_cp_ledger t

union all
select 'public.user_daily_task_completions', to_jsonb(t)
from public.user_daily_task_completions t

union all
select 'public.user_daily_free_gacha', to_jsonb(t)
from public.user_daily_free_gacha t

union all
select 'public.user_bonus_roulette_claims', to_jsonb(t)
from public.user_bonus_roulette_claims t

union all
select 'public.user_gacha_collections', to_jsonb(t)
from public.user_gacha_collections t

union all
select 'public.user_gacha_draw_history', to_jsonb(t)
from public.user_gacha_draw_history t

union all
select 'public.user_gacha_exchange_history', to_jsonb(t)
from public.user_gacha_exchange_history t

union all
select 'public.user_gacha_collection_notices', to_jsonb(t)
from public.user_gacha_collection_notices t

union all
select 'public.gacha_serials', to_jsonb(t)
from public.gacha_serials t

union all
select 'public.dm_threads', to_jsonb(t)
from public.dm_threads t

union all
select 'public.dm_messages', to_jsonb(t)
from public.dm_messages t

union all
select 'public.user_push_subscriptions', to_jsonb(t)
from public.user_push_subscriptions t

union all
select 'public.user_push_notification_log', to_jsonb(t)
from public.user_push_notification_log t

order by table_name;
