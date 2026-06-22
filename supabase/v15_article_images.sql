-- AgrindPress v15: article images for body content
-- Jalankan di Supabase SQL Editor sebelum memakai fitur IMG di editor.

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Body image storage bucket
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

drop policy if exists "article_images_public_select" on storage.objects;
drop policy if exists "article_images_authenticated_insert" on storage.objects;
drop policy if exists "article_images_authenticated_update" on storage.objects;
drop policy if exists "article_images_authenticated_delete" on storage.objects;

create policy "article_images_public_select"
on storage.objects
for select
to public
using (bucket_id = 'article-images');

create policy "article_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'article-images');

create policy "article_images_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'article-images')
with check (bucket_id = 'article-images');

create policy "article_images_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'article-images');

-- ------------------------------------------------------------
-- Body image metadata table
-- ------------------------------------------------------------
create table if not exists public.article_images (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  bucket_name text not null default 'article-images',
  image_path text not null,
  image_url text not null,
  alt_text text,
  credit_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_article_images_post_id
  on public.article_images(post_id);

create index if not exists idx_article_images_sort_order
  on public.article_images(sort_order);

alter table public.article_images enable row level security;

drop policy if exists "article_images_select_authenticated" on public.article_images;
drop policy if exists "article_images_insert_authenticated" on public.article_images;
drop policy if exists "article_images_update_authenticated" on public.article_images;
drop policy if exists "article_images_delete_authenticated" on public.article_images;

create policy "article_images_select_authenticated"
on public.article_images
for select
to authenticated
using (true);

create policy "article_images_insert_authenticated"
on public.article_images
for insert
to authenticated
with check (true);

create policy "article_images_update_authenticated"
on public.article_images
for update
to authenticated
using (true)
with check (true);

create policy "article_images_delete_authenticated"
on public.article_images
for delete
to authenticated
using (true);

commit;
