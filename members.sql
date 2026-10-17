-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run
create sequence if not exists member_seq start 100;

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id text unique not null default ('TRC-' || lpad(nextval('member_seq')::text, 3, '0')),
  name text not null,
  role text not null default 'Initiate',
  joined date not null default current_date
);

alter table public.members enable row level security;

drop policy if exists "members readable by everyone" on public.members;
create policy "members readable by everyone" on public.members for select using (true);

drop policy if exists "users add own member row" on public.members;
create policy "users add own member row" on public.members for insert to authenticated with check (auth.uid() = user_id);
-- (email is NOT stored here, so it is never public)
