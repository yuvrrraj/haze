-- ============================================
-- FIX PROFILES RLS FOR UPSERT
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop all existing profiles policies to start clean
drop policy if exists "Public profiles" on profiles;
drop policy if exists "Own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Anyone can read profiles" on profiles;

-- SELECT: anyone can read profiles
create policy "profiles_select"
  on profiles for select
  using (true);

-- INSERT: authenticated users can insert their own profile
create policy "profiles_insert"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- UPDATE: authenticated users can update their own profile
create policy "profiles_update"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- DELETE: authenticated users can delete their own profile
create policy "profiles_delete"
  on profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Make sure RLS is enabled
alter table profiles enable row level security;

-- Verify policies are in place
select policyname, cmd, roles
from pg_policies
where tablename = 'profiles';
