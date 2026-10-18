-- Run this ONCE in Supabase: SQL Editor -> New query -> paste ALL of it -> Run
-- (safe to run again; it only adds what is missing)
create sequence if not exists member_seq start 100;

create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id text unique not null default ('TRC-' || lpad(nextval('member_seq')::text, 3, '0')),
  name text not null,
  role text not null default 'Initiate',
  joined date not null default current_date
);

alter table public.members enable row level security;

-- everyone (even logged-out visitors) may read the list; email is NOT stored here
drop policy if exists "members readable by everyone" on public.members;
create policy "members readable by everyone" on public.members for select to anon, authenticated using (true);

drop policy if exists "users add own member row" on public.members;
create policy "users add own member row" on public.members for insert to authenticated with check (auth.uid() = user_id);

grant select on public.members to anon, authenticated;
grant insert on public.members to authenticated;

-- automatically add every new account to the member list (works even before email confirmation)
create or replace function public.add_member_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (user_id, name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'alias', ''), split_part(new.email, '@', 1)), 40))
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created_member on auth.users;
create trigger on_auth_user_created_member after insert on auth.users
  for each row execute function public.add_member_on_signup();

-- add everyone who already has an account
insert into public.members (user_id, name, joined)
select id, left(coalesce(nullif(raw_user_meta_data->>'alias', ''), split_part(email, '@', 1)), 40), created_at::date
from auth.users
on conflict (user_id) do nothing;
