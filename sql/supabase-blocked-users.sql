-- Blocked users table
create table if not exists blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

alter table blocked_users enable row level security;

create policy "Users manage own blocks"
  on blocked_users for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

-- Allow reading blocks where you are the blocked party (needed for DM check)
create policy "Users can see if they are blocked"
  on blocked_users for select
  using (auth.uid() = blocked_id);
