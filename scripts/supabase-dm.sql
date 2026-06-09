-- 運営DM（Supabase SQL Editor で実行）
-- supabase-setup.sql 実行後に追加してください

create table if not exists public.dm_threads (
  id text primary key,
  user_key text not null unique,
  user_display_name text not null,
  user_email text,
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  user_unread_count integer not null default 0 check (user_unread_count >= 0),
  admin_unread_count integer not null default 0 check (admin_unread_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.dm_messages (
  id text primary key,
  thread_id text not null references public.dm_threads(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists dm_messages_thread_id_created_at_idx
  on public.dm_messages (thread_id, created_at);

create index if not exists dm_threads_last_message_at_idx
  on public.dm_threads (last_message_at desc);

create index if not exists dm_threads_admin_unread_idx
  on public.dm_threads (admin_unread_count desc, last_message_at desc);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

grant all on public.dm_threads to service_role;
grant all on public.dm_messages to service_role;

drop policy if exists "No public access on dm_threads" on public.dm_threads;
create policy "No public access on dm_threads"
  on public.dm_threads
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "No public access on dm_messages" on public.dm_messages;
create policy "No public access on dm_messages"
  on public.dm_messages
  for all
  to anon, authenticated
  using (false)
  with check (false);
