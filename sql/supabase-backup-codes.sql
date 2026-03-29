-- ============================================================
-- BACKUP CODES FEATURE
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add backup_codes column (array of bcrypt hashes)
alter table profiles
  add column if not exists backup_codes text[] default null;

-- 2. RPC: Save backup codes (hashes them server-side)
create or replace function save_backup_codes(user_id uuid, plain_codes text[])
returns void language plpgsql security definer as $$
declare
  hashed text[];
  code text;
begin
  if auth.uid() <> user_id then raise exception 'Unauthorized'; end if;
  hashed := array[]::text[];
  foreach code in array plain_codes loop
    hashed := array_append(hashed, crypt(code, gen_salt('bf', 8)));
  end loop;
  update profiles set backup_codes = hashed where id = user_id;
end;
$$;

-- 3. RPC: Verify and consume a backup code (one-time use)
create or replace function use_backup_code(user_id uuid, plain_code text)
returns boolean language plpgsql security definer as $$
declare
  codes text[];
  code text;
  idx int := 0;
  found_idx int := -1;
begin
  select backup_codes into codes from profiles where id = user_id;
  if codes is null then return false; end if;
  foreach code in array codes loop
    idx := idx + 1;
    if code = crypt(plain_code, code) then
      found_idx := idx;
      exit;
    end if;
  end loop;
  if found_idx = -1 then return false; end if;
  -- Remove the used code
  update profiles
    set backup_codes = array_remove(backup_codes, codes[found_idx])
    where id = user_id;
  return true;
end;
$$;

-- 4. RPC: Clear all backup codes
create or replace function clear_backup_codes(user_id uuid)
returns void language plpgsql security definer as $$
begin
  if auth.uid() <> user_id then raise exception 'Unauthorized'; end if;
  update profiles set backup_codes = null where id = user_id;
end;
$$;

-- 5. RPC: Get remaining backup codes count (not the codes themselves)
create or replace function get_backup_codes_count(user_id uuid)
returns int language plpgsql security definer as $$
declare
  codes text[];
begin
  select backup_codes into codes from profiles where id = user_id;
  if codes is null then return 0; end if;
  return array_length(codes, 1);
end;
$$;
