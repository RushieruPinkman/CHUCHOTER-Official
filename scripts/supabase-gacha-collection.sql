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

create table if not exists public.user_gacha_exchange_history (
  user_key text not null,
  record_id text not null,
  record jsonb not null,
  exchanged_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_key, record_id)
);

create index if not exists user_gacha_exchange_history_user_exchanged_at_idx
  on public.user_gacha_exchange_history (user_key, exchanged_at desc);

alter table public.user_gacha_collections enable row level security;
alter table public.user_gacha_draw_history enable row level security;
alter table public.user_gacha_exchange_history enable row level security;

grant all on public.user_gacha_collections to service_role;
grant all on public.user_gacha_draw_history to service_role;
grant all on public.user_gacha_exchange_history to service_role;

drop policy if exists "No public access on user_gacha_collections" on public.user_gacha_collections;
create policy "No public access on user_gacha_collections"
  on public.user_gacha_collections for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No public access on user_gacha_draw_history" on public.user_gacha_draw_history;
create policy "No public access on user_gacha_draw_history"
  on public.user_gacha_draw_history for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No public access on user_gacha_exchange_history" on public.user_gacha_exchange_history;
create policy "No public access on user_gacha_exchange_history"
  on public.user_gacha_exchange_history for all to anon, authenticated
  using (false) with check (false);

-- 履歴上限を超えた行を一括削除（service_role のみ実行）
create or replace function public.trim_user_gacha_draw_history(
  p_user_key text,
  p_keep int default 10
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  with keep as (
    select record_id
    from public.user_gacha_draw_history
    where user_key = p_user_key
    order by won_at desc
    limit greatest(p_keep, 0)
  )
  delete from public.user_gacha_draw_history h
  where h.user_key = p_user_key
    and not exists (
      select 1 from keep k where k.record_id = h.record_id
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.trim_user_gacha_draw_history(text, int) from public;
grant execute on function public.trim_user_gacha_draw_history(text, int) to service_role;
