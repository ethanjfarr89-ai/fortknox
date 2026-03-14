-- FortKnox Database Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create the pieces table
create table if not exists public.pieces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  metal_type text not null default 'gold',
  metal_weight_grams numeric,
  metal_karat numeric,
  gemstone_notes text,
  history text,
  significance text,
  appraised_value numeric,
  photo_urls text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.pieces enable row level security;

-- 3. Create policies so users can only access their own pieces
create policy "Users can view their own pieces"
  on public.pieces for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pieces"
  on public.pieces for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pieces"
  on public.pieces for update
  using (auth.uid() = user_id);

create policy "Users can delete their own pieces"
  on public.pieces for delete
  using (auth.uid() = user_id);

-- 4. Create a storage bucket for photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 5. Storage policies — allow authenticated users to upload, and public read
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

create policy "Anyone can view photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Users can delete their own uploads"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos');
