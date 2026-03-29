-- Create missing profiles for users who signed up without one
insert into profiles (id, username, created_at)
select 
  u.id,
  split_part(u.email, '@', 1),
  u.created_at
from auth.users u
left join profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Verify
select id, username from profiles;
