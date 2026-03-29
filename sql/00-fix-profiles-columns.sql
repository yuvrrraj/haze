-- Run this FIRST in Supabase SQL Editor to fix signup 500 error
-- Adds missing columns to profiles table

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists is_private boolean default false;
alter table profiles add column if not exists is_verified boolean default false;
alter table profiles add column if not exists followers_count int default 0;
alter table profiles add column if not exists following_count int default 0;

-- Fix RLS to allow insert on signup
drop policy if exists "Public profiles" on profiles;
drop policy if exists "Own profile" on profiles;
drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;
drop policy if exists "profiles_delete" on profiles;

create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete" on profiles for delete to authenticated using (auth.uid() = id);

alter table profiles enable row level security;
