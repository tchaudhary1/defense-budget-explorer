-- Visitor-activity log for the Defense Budget Explorer. Run once in the Supabase SQL editor (project aizytqcqzgtlghvayyle).
-- Safe to re-run. The admin address appears twice below; change both if it ever changes (and ADMIN_EMAIL in config.js).

create table if not exists public.dbe_events (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  user_id  uuid not null default auth.uid(),
  email    text,
  sid      text,                 -- one id per browser session (page load)
  kind     text not null,        -- visit | tab | click | story | search | leave
  detail   jsonb
);
create index if not exists dbe_events_at_idx   on public.dbe_events (at desc);
create index if not exists dbe_events_user_idx on public.dbe_events (user_id, at desc);

alter table public.dbe_events enable row level security;
revoke all on public.dbe_events from anon;
grant insert on public.dbe_events to authenticated;
grant select on public.dbe_events to authenticated;   -- row-level policy below limits reads to the admin

-- every signed-in user may write rows about themselves only
drop policy if exists "dbe events: insert own" on public.dbe_events;
create policy "dbe events: insert own" on public.dbe_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- only the admin may read
drop policy if exists "dbe events: admin read" on public.dbe_events;
create policy "dbe events: admin read" on public.dbe_events
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'tchaudhary@gatech.edu');

-- who has an account and when they last signed in, from the auth record itself
-- (so sign-ins that happened before this log existed still show). Admin only.
create or replace function public.dbe_admin_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz)
language sql
security definer
set search_path = public, auth
as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where lower(auth.jwt() ->> 'email') = 'tchaudhary@gatech.edu'
  order by u.created_at;
$$;
revoke all on function public.dbe_admin_users() from public;
grant execute on function public.dbe_admin_users() to authenticated;
