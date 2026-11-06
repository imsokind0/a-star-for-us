-- A STAR FOR US: run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.mailbox (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 1 and 40),
  q1 text, q2 text, q3 text, q4 text, q5 text,
  letter text not null check (char_length(letter) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  content text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.secret_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.mailbox enable row level security;
alter table public.memories enable row level security;
alter table public.secret_videos enable row level security;

-- No client can list admin accounts. The security-definer function only returns a boolean.
drop policy if exists "admins can read own admin row" on public.admin_users;
create policy "admins can read own admin row" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- Visitors can submit a letter, but only an admin can read or modify submitted letters.
drop policy if exists "anyone can send a letter" on public.mailbox;
create policy "anyone can send a letter" on public.mailbox
  for insert to anon, authenticated with check (
    char_length(nickname) between 1 and 40 and char_length(letter) between 1 and 10000
  );
drop policy if exists "admins can read letters" on public.mailbox;
create policy "admins can read letters" on public.mailbox
  for select to authenticated using (public.is_site_admin());
drop policy if exists "admins can delete letters" on public.mailbox;
create policy "admins can delete letters" on public.mailbox
  for delete to authenticated using (public.is_site_admin());

-- Published memories and videos are visible to visitors; writes are admin-only.
drop policy if exists "public can view memories" on public.memories;
create policy "public can view memories" on public.memories
  for select to anon, authenticated using (true);
drop policy if exists "admins can manage memories" on public.memories;
create policy "admins can manage memories" on public.memories
  for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "public can view videos" on public.secret_videos;
create policy "public can view videos" on public.secret_videos
  for select to anon, authenticated using (true);
drop policy if exists "admins can manage videos" on public.secret_videos;
create policy "admins can manage videos" on public.secret_videos
  for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- Public bucket is intentional: memory photos are displayed on the public gallery.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-images', 'memory-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "public can view memory images" on storage.objects;
create policy "public can view memory images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'memory-images');
drop policy if exists "admins can upload memory images" on storage.objects;
create policy "admins can upload memory images" on storage.objects
  for insert to authenticated with check (bucket_id = 'memory-images' and public.is_site_admin());
drop policy if exists "admins can update memory images" on storage.objects;
create policy "admins can update memory images" on storage.objects
  for update to authenticated using (bucket_id = 'memory-images' and public.is_site_admin())
  with check (bucket_id = 'memory-images' and public.is_site_admin());
drop policy if exists "admins can delete memory images" on storage.objects;
create policy "admins can delete memory images" on storage.objects
  for delete to authenticated using (bucket_id = 'memory-images' and public.is_site_admin());
