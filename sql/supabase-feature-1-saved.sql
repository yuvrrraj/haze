-- ============================================================
-- SOCIALSITE: Feature 1 — Saved Posts & Reels
-- Run this in: Supabase SQL Editor
-- ============================================================

create table if not exists saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade,
  reel_id uuid references reels(id) on delete cascade,
  created_at timestamptz default now(),
  constraint saved_one_type check (
    (post_id is not null and reel_id is null) or
    (reel_id is not null and post_id is null)
  ),
  unique(user_id, post_id),
  unique(user_id, reel_id)
);

alter table saved_posts enable row level security;

create policy "Own saved" on saved_posts for all using (auth.uid() = user_id);
create policy "Read own saved" on saved_posts for select using (auth.uid() = user_id);
