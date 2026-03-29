-- Create follows table
create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table follows enable row level security;

-- Anyone can read follows (for counts)
create policy "follows_select" on follows for select using (true);

-- Authenticated users can follow
create policy "follows_insert" on follows for insert to authenticated
  with check (auth.uid() = follower_id);

-- Authenticated users can unfollow their own follows
create policy "follows_delete" on follows for delete to authenticated
  using (auth.uid() = follower_id);
