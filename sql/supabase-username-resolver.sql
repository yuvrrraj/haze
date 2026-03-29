-- ============================================================
-- USERNAME TO EMAIL RESOLVER FOR RESET PASSWORD
-- Run this in Supabase SQL Editor
-- ============================================================

-- RPC: Get email by username (for reset password flow)
create or replace function get_email_by_username(uname text)
returns text language plpgsql security definer as $$
declare
  uid uuid;
  user_email text;
begin
  select id into uid from profiles where username = lower(uname) limit 1;
  if uid is null then return null; end if;
  select email into user_email from auth.users where id = uid limit 1;
  return user_email;
end;
$$;
