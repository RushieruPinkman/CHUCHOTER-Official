-- Supabase SQL Editor で実行（初回・再実行どちらも可）
-- 既存の設定は上書きせず、足りない部分だけ追加します

create table if not exists public.site_data (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_data enable row level security;

grant all on public.site_data to service_role;

-- 匿名ユーザーからは読み書き不可（サーバー側の service_role キーのみアクセス）
drop policy if exists "No public access" on public.site_data;
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

-- Storage: 公開バケットの読み取り
drop policy if exists "Public read cast images" on storage.objects;
create policy "Public read cast images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'cast-images');
