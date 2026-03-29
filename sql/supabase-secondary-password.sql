-- ============================================================
-- SECONDARY PASSWORD FEATURE
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable pgcrypto for bcrypt hashing
create extension if not exists pgcrypto;

-- 2. Add secondary_password_hash column to profiles
alter table profiles
  add column if not exists secondary_password_hash text default null;

-- 3. RPC: Set secondary password (hashes it server-side)
create or replace function set_secondary_password(user_id uuid, plain_password text)
returns void language plpgsql security definer as $$
begin
  if auth.uid() <> user_id then
    raise exception 'Unauthorized';
  end if;
  update profiles
    set secondary_password_hash = crypt(plain_password, gen_salt('bf', 10))
    where id = user_id;
end;
$$;

-- 4. RPC: Verify secondary password (returns true/false)
create or replace function verify_secondary_password(user_id uuid, plain_password text)
returns boolean language plpgsql security definer as $$
declare
  stored_hash text;
begin
  select secondary_password_hash into stored_hash
    from profiles where id = user_id;
  if stored_hash is null then return false; end if;
  return stored_hash = crypt(plain_password, stored_hash);
end;
$$;

-- 5. RPC: Remove secondary password
create or replace function remove_secondary_password(user_id uuid)
returns void language plpgsql security definer as $$
begin
  if auth.uid() <> user_id then
    raise exception 'Unauthorized';
  end if;
  update profiles set secondary_password_hash = null where id = user_id;
end;
$$;

-- 6. RPC: Check if user has secondary password set (for forgot password flow)
-- This is called with just email so we need to look up by email via auth.users
create or replace function has_secondary_password_by_email(user_email text)
returns boolean language plpgsql security definer as $$
declare
  uid uuid;
  stored_hash text;
begin
  select id into uid from auth.users where email = lower(user_email) limit 1;
  if uid is null then return false; end if;
  select secondary_password_hash into stored_hash from profiles where id = uid;
  return stored_hash is not null;
end;
$$;

-- 7. RPC: Reset main password using secondary password (no auth required — for forgot flow)
create or replace function reset_password_with_secondary(
  user_email text,
  secondary_plain text,
  new_password text
)
returns boolean language plpgsql security definer as $$
declare
  uid uuid;
  stored_hash text;
begin
  select id into uid from auth.users where email = lower(user_email) limit 1;
  if uid is null then return false; end if;
  select secondary_password_hash into stored_hash from profiles where id = uid;
  if stored_hash is null then return false; end if;
  if stored_hash <> crypt(secondary_plain, stored_hash) then return false; end if;
  update auth.users set
    encrypted_password = crypt(new_password, gen_salt('bf', 10)),
    updated_at = now()
  where id = uid;
  return true;
end;
$$;

-- 8. RPC: Verify secondary password by email (for forgot password flow)
create or replace function verify_secondary_password_by_email(user_email text, plain_password text)
returns boolean language plpgsql security definer as $$
declare
  uid uuid;
  stored_hash text;
begin
  select id into uid from auth.users where email = lower(user_email) limit 1;
  if uid is null then return false; end if;
  select secondary_password_hash into stored_hash from profiles where id = uid;
  if stored_hash is null then return false; end if;
  return stored_hash = crypt(plain_password, stored_hash);
end;
$$;
