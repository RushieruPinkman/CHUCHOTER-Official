-- シュシュテポイント（CP）・デイリータスク（Supabase SQL Editor で実行）
-- supabase-setup.sql 実行後に追加してください

create table if not exists public.user_cp_balances (
  user_key text primary key,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_cp_ledger (
  id text primary key,
  user_key text not null,
  amount integer not null,
  reason text not null,
  ref_id text,
  created_at timestamptz not null default now()
);

create index if not exists user_cp_ledger_user_key_created_at_idx
  on public.user_cp_ledger (user_key, created_at desc);

create table if not exists public.user_daily_task_completions (
  user_key text not null,
  task_date date not null,
  task_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_key, task_date, task_id)
);

create index if not exists user_daily_task_completions_task_date_idx
  on public.user_daily_task_completions (task_date desc);

alter table public.user_cp_balances enable row level security;
alter table public.user_cp_ledger enable row level security;
alter table public.user_daily_task_completions enable row level security;

grant all on public.user_cp_balances to service_role;
grant all on public.user_cp_ledger to service_role;
grant all on public.user_daily_task_completions to service_role;

drop policy if exists "No public access on user_cp_balances" on public.user_cp_balances;
create policy "No public access on user_cp_balances"
  on public.user_cp_balances for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No public access on user_cp_ledger" on public.user_cp_ledger;
create policy "No public access on user_cp_ledger"
  on public.user_cp_ledger for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No public access on user_daily_task_completions" on public.user_daily_task_completions;
create policy "No public access on user_daily_task_completions"
  on public.user_daily_task_completions for all to anon, authenticated
  using (false) with check (false);

-- 1日1回の無料ガチャ（日本時間の暦日）
create table if not exists public.user_daily_free_gacha (
  user_key text not null,
  draw_date date not null,
  drawn_at timestamptz not null default now(),
  primary key (user_key, draw_date)
);

create index if not exists user_daily_free_gacha_draw_date_idx
  on public.user_daily_free_gacha (draw_date desc);

alter table public.user_daily_free_gacha enable row level security;

grant all on public.user_daily_free_gacha to service_role;

drop policy if exists "No public access on user_daily_free_gacha" on public.user_daily_free_gacha;
create policy "No public access on user_daily_free_gacha"
  on public.user_daily_free_gacha for all to anon, authenticated
  using (false) with check (false);
