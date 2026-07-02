-- デイリー / ウィークリー / マンスリーボーナスルーレット（Supabase SQL Editor で実行）
-- supabase-cp.sql 実行後に追加してください

create table if not exists public.user_bonus_roulette_claims (
  user_key text not null,
  bonus_type text not null check (bonus_type in ('daily', 'weekly', 'monthly')),
  period_key text not null,
  cp_amount integer not null check (cp_amount > 0),
  prize_index integer not null check (prize_index >= 0),
  spun_at timestamptz not null default now(),
  collected_at timestamptz,
  primary key (user_key, bonus_type, period_key)
);

create index if not exists user_bonus_roulette_claims_period_idx
  on public.user_bonus_roulette_claims (bonus_type, period_key desc);

alter table public.user_bonus_roulette_claims enable row level security;

grant all on public.user_bonus_roulette_claims to service_role;

drop policy if exists "No public access on user_bonus_roulette_claims" on public.user_bonus_roulette_claims;
create policy "No public access on user_bonus_roulette_claims"
  on public.user_bonus_roulette_claims for all to anon, authenticated
  using (false) with check (false);
