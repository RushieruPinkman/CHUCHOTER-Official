-- Supabase SQL Editor で一度実行してください（無料プランで利用可）

create table if not exists public.site_data (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_data enable row level security;

-- 匿名ユーザーからは読み書き不可（サーバー側の service_role キーのみアクセス）
create policy "No public access"
  on public.site_data
  for all
  to anon, authenticated
  using (false)
  with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cast-images',
  'cast-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
