-- Run this in Supabase SQL Editor

create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  bio text,
  avatar_url text,
  cover_url text,
  created_at timestamptz default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  caption text,
  image_url text not null,
  likes_count int default 0,
  comments_count int default 0,
  created_at timestamptz default now()
);

create table reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  caption text,
  video_url text not null,
  hls_url text,
  thumbnail_url text,
  likes_count int default 0,
  created_at timestamptz default now()
);

create table stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  video_url text,
  image_url text,
  thumbnail_url text,
  expires_at timestamptz default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table posts enable row level security;
alter table reels enable row level security;
alter table stories enable row level security;
alter table likes enable row level security;

-- Public read policies
create policy "Public profiles" on profiles for select using (true);
create policy "Public posts" on posts for select using (true);
create policy "Public reels" on reels for select using (true);
create policy "Public stories" on stories for select using (true);

-- Authenticated write policies
create policy "Own profile" on profiles for all using (auth.uid() = id);
create policy "Own posts" on posts for insert with check (auth.uid() = user_id);
create policy "Own reels" on reels for insert with check (auth.uid() = user_id);
create policy "Own stories" on stories for insert with check (auth.uid() = user_id);
create policy "Own likes" on likes for all using (auth.uid() = user_id);
