-- ============================================
-- PRIVATE ACCOUNT FEATURE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add is_private column to profiles
alter table profiles add column if not exists is_private boolean default false;

-- 2. Create follow_requests table
create table if not exists follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete cascade not null,
  target_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(requester_id, target_id)
);

-- 3. Enable RLS
alter table follow_requests enable row level security;

-- 4. RLS policies for follow_requests
create policy "follow_requests_select" on follow_requests for select using (
  auth.uid() = requester_id or auth.uid() = target_id
);
create policy "follow_requests_insert" on follow_requests for insert with check (
  auth.uid() = requester_id
);
create policy "follow_requests_delete" on follow_requests for delete using (
  auth.uid() = requester_id or auth.uid() = target_id
);

-- 5. Update posts RLS — private account posts only visible to followers or owner
drop policy if exists "Public posts" on posts;
drop policy if exists "posts_select" on posts;
create policy "posts_select" on posts for select using (
  -- owner always sees own posts
  auth.uid() = user_id
  or
  -- public account — everyone sees
  not exists (
    select 1 from profiles where id = posts.user_id and is_private = true
  )
  or
  -- private account — only approved followers see
  exists (
    select 1 from follows where follower_id = auth.uid() and following_id = posts.user_id
  )
);

-- 6. Update reels RLS — same logic
drop policy if exists "Public reels" on reels;
drop policy if exists "reels_select" on reels;
create policy "reels_select" on reels for select using (
  auth.uid() = user_id
  or
  not exists (
    select 1 from profiles where id = reels.user_id and is_private = true
  )
  or
  exists (
    select 1 from follows where follower_id = auth.uid() and following_id = reels.user_id
  )
);

-- 7. Allow profile is_private update
drop policy if exists "Users can update own profile" on profiles;
create policy "profiles_update" on profiles for update using (auth.uid() = id);
