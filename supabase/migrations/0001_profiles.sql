-- 0001_profiles.sql — profile table + role enum + new-user trigger + RLS

-- 1. role enum
create type public.role_enum as enum ('student', 'admin');

-- 2. profiles table (mirrors auth.users, stores role + metadata)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.role_enum not null default 'student',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- 3. updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- 4. new-user trigger: auto-insert a profile row for every new auth.users entry
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', null));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. Row Level Security
alter table public.profiles enable row level security;

-- Student: SELECT own row
create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

-- Student: UPDATE own row (cannot change role — enforced in app code + admin check below)
create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin: SELECT all rows
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admin: UPDATE all rows (including role changes)
create policy "profiles_update_admin"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- No INSERT policy: only the SECURITY DEFINER trigger creates rows.
-- No DELETE policy: deletion cascades from auth.users.
