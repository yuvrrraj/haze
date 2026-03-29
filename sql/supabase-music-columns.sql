-- Add music columns to posts and reels tables
-- Run this in Supabase SQL editor

alter table posts
  add column if not exists music_name text,
  add column if not exists music_artist text,
  add column if not exists music_cover text,
  add column if not exists music_preview_url text;

alter table reels
  add column if not exists music_name text,
  add column if not exists music_artist text,
  add column if not exists music_cover text,
  add column if not exists music_preview_url text;

alter table stories
  add column if not exists music_name text,
  add column if not exists music_artist text,
  add column if not exists music_cover text,
  add column if not exists music_preview_url text;
