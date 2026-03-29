-- ══════════════════════════════════════════════════════════════════
-- GROUPS & CHANNELS — FINAL SCHEMA
-- Run this in Supabase SQL Editor (safe to re-run)
-- ══════════════════════════════════════════════════════════════════

-- ── Tables ────────────────────────────────────────────────────────

create table if not exists groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  avatar_url    text,
  type          text not null default 'group' check (type in ('group','channel')),
  created_by    uuid not null references profiles(id) on delete cascade,
  last_message  text,
  last_message_at timestamptz default now(),
  created_at    timestamptz default now()
);

create table if not exists group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('admin','member','allowed')),
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

create table if not exists group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  content    text not null,
  type       text not null default 'text' check (type in ('text','voice')),
  created_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────

create index if not exists idx_groups_created_by        on groups(created_by);
create index if not exists idx_group_members_group_id   on group_members(group_id);
create index if not exists idx_group_members_user_id    on group_members(user_id);
create index if not exists idx_group_messages_group_id  on group_messages(group_id);
create index if not exists idx_group_messages_created_at on group_messages(created_at);

-- ── Enable RLS ────────────────────────────────────────────────────

alter table groups         enable row level security;
alter table group_members  enable row level security;
alter table group_messages enable row level security;

-- ── Drop old policies (safe) ──────────────────────────────────────

drop policy if exists "Members can view groups"        on groups;
drop policy if exists "Anyone can create groups"       on groups;
drop policy if exists "Admins can update groups"       on groups;
drop policy if exists "Admins can delete groups"       on groups;

drop policy if exists "Members can view group_members" on group_members;
drop policy if exists "Admins can manage members"      on group_members;
drop policy if exists "Users can join groups"          on group_members;
drop policy if exists "Users can leave groups"         on group_members;

drop policy if exists "Members can view messages"      on group_messages;
drop policy if exists "Members can send messages"      on group_messages;

-- ── groups policies ───────────────────────────────────────────────

-- SELECT: only members can see the group
create policy "Members can view groups"
  on groups for select
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );

-- INSERT: creator must match auth user
create policy "Anyone can create groups"
  on groups for insert
  with check (auth.uid() = created_by);

-- UPDATE: only admins of that group
create policy "Admins can update groups"
  on groups for update
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- DELETE: only the original creator
create policy "Creator can delete group"
  on groups for delete
  using (auth.uid() = created_by);

-- ── group_members policies ────────────────────────────────────────

-- SELECT: any member of the group can see the member list
create policy "Members can view group_members"
  on group_members for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

-- INSERT: either the user is adding themselves (joining/creator bootstrap)
--         OR an admin of that group is adding someone
create policy "Insert group_members"
  on group_members for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );

-- UPDATE: only admins can change roles
create policy "Admins can update member roles"
  on group_members for update
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );

-- DELETE: admin can remove anyone, or user can remove themselves (leave)
create policy "Remove group_members"
  on group_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );

-- ── group_messages policies ───────────────────────────────────────

-- SELECT: any member can read messages
create policy "Members can view messages"
  on group_messages for select
  using (
    exists (
      select 1 from group_members
      where group_id = group_messages.group_id and user_id = auth.uid()
    )
  );

-- INSERT:
--   group  → any member can send
--   channel → only admin or allowed role can send
create policy "Members can send messages"
  on group_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from group_members gm
      join groups g on g.id = gm.group_id
      where gm.group_id = group_messages.group_id
        and gm.user_id  = auth.uid()
        and (
          g.type = 'group'
          or gm.role in ('admin', 'allowed')
        )
    )
  );

-- DELETE: sender can delete their own message, admin can delete any
create policy "Delete group messages"
  on group_messages for delete
  using (
    auth.uid() = sender_id
    or exists (
      select 1 from group_members
      where group_id = group_messages.group_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- ── Enable Realtime ───────────────────────────────────────────────
-- Run these in Supabase dashboard → Database → Replication
-- or uncomment below:

-- alter publication supabase_realtime add table group_messages;
-- alter publication supabase_realtime add table group_members;
-- alter publication supabase_realtime add table groups;
