-- ウェブプッシュ通知（Supabase SQL Editor で実行）
-- supabase-cp.sql 実行後に追加してください

create table if not exists public.user_push_subscriptions (
  id text primary key,
  user_key text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  notify_dm boolean not null default true,
  notify_bonus boolean not null default true,
  notify_gacha boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_push_subscriptions_user_key_idx
  on public.user_push_subscriptions (user_key);

create table if not exists public.user_push_notification_log (
  user_key text not null,
  notification_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_key, notification_key)
);

create index if not exists user_push_notification_log_sent_at_idx
  on public.user_push_notification_log (sent_at desc);

alter table public.user_push_subscriptions enable row level security;
alter table public.user_push_notification_log enable row level security;

grant all on public.user_push_subscriptions to service_role;
grant all on public.user_push_notification_log to service_role;

drop policy if exists "No public access on user_push_subscriptions" on public.user_push_subscriptions;
create policy "No public access on user_push_subscriptions"
  on public.user_push_subscriptions for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No public access on user_push_notification_log" on public.user_push_notification_log;
create policy "No public access on user_push_notification_log"
  on public.user_push_notification_log for all to anon, authenticated
  using (false) with check (false);
