-- 20260708000000_leads.sql — public lead-capture table for landing pages (e.g. /lead-success)

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text not null,
  source      text not null default 'lead-success',
  created_at  timestamptz not null default now()
);

create index leads_source_idx on public.leads (source);
create index leads_created_at_idx on public.leads (created_at);

-- Row Level Security
alter table public.leads enable row level security;

-- Anonymous + authenticated visitors: INSERT only (public opt-in form, no user_id to scope by)
create policy "leads_insert_public"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- Admin: SELECT all rows
create policy "leads_select_admin"
  on public.leads
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- No UPDATE/DELETE policies — out of scope for this feature.
