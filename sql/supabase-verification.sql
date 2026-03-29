-- ============================================================
-- VERIFICATION SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add is_verified to profiles
alter table profiles add column if not exists is_verified boolean default false;

-- 2. Verification requests table
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  full_name text not null,
  username text not null,
  category text not null,
  reason text not null,
  link1 text not null,
  link2 text not null,
  contact_email text not null,
  agreed_to_rules boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id)
);

-- 3. RLS
alter table verification_requests enable row level security;

-- User can insert/select their own request
create policy "Own verification request" on verification_requests
  for all using (auth.uid() = user_id);

-- Special user (verified) can read all requests
create policy "Verified user reads all" on verification_requests
  for select using (
    exists (
      select 1 from profiles where id = auth.uid() and username = 'verified'
    )
  );

-- Service role can do everything (for API route)
-- (service role bypasses RLS by default)

-- 4. Notification types for verified/rejected are handled by existing notifications table
-- Just insert with type = 'verified' or 'verification_rejected'
