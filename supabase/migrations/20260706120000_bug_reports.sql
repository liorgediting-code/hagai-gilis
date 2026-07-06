-- 20260706120000_bug_reports.sql
-- Student bug reporting: students file reports, admin reads and can delete them.

create table public.bug_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null check (category in ('lessons', 'exercises', 'summaries', 'market', 'other')),
  description  text not null,
  page_url     text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index bug_reports_created_idx on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

create policy "bug_reports_insert_own"
  on public.bug_reports for insert to authenticated
  with check (user_id = auth.uid());

create policy "bug_reports_select_own"
  on public.bug_reports for select to authenticated
  using (user_id = auth.uid());

create policy "bug_reports_select_admin"
  on public.bug_reports for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "bug_reports_delete_admin"
  on public.bug_reports for delete to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
