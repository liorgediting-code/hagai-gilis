-- 0002_courses.sql — course system: modules, lessons, progress, summaries, permissions

-- ============================================================
-- 1. modules
-- ============================================================
create table public.modules (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  order_index  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger modules_set_updated_at
  before update on public.modules
  for each row
  execute function public.set_updated_at();

alter table public.modules enable row level security;

-- Any authenticated user can read modules
create policy "modules_select_authenticated"
  on public.modules
  for select
  to authenticated
  using (true);

-- Admin: full write access
create policy "modules_insert_admin"
  on public.modules
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "modules_update_admin"
  on public.modules
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "modules_delete_admin"
  on public.modules
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- ============================================================
-- 2. lessons
-- ============================================================
create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules(id) on delete cascade,
  title       text not null,
  description text,
  video_url   text,
  order_index int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index lessons_module_order_idx on public.lessons (module_id, order_index);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row
  execute function public.set_updated_at();

alter table public.lessons enable row level security;

create policy "lessons_select_authenticated"
  on public.lessons
  for select
  to authenticated
  using (true);

create policy "lessons_insert_admin"
  on public.lessons
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "lessons_update_admin"
  on public.lessons
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "lessons_delete_admin"
  on public.lessons
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- ============================================================
-- 3. lesson_progress
-- ============================================================
create table public.lesson_progress (
  user_id                uuid not null references auth.users(id) on delete cascade,
  lesson_id              uuid not null references public.lessons(id) on delete cascade,
  last_position_seconds  int not null default 0,
  completed_at           timestamptz,
  updated_at             timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_user_idx on public.lesson_progress (user_id);

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row
  execute function public.set_updated_at();

alter table public.lesson_progress enable row level security;

-- Student: SELECT own rows
create policy "lesson_progress_select_own"
  on public.lesson_progress
  for select
  to authenticated
  using (user_id = auth.uid());

-- Student: INSERT own rows (upsert path — insert leg)
create policy "lesson_progress_insert_own"
  on public.lesson_progress
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Student: UPDATE own rows (upsert path — update leg)
create policy "lesson_progress_update_own"
  on public.lesson_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin: SELECT all rows (for progress reporting)
create policy "lesson_progress_select_admin"
  on public.lesson_progress
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- ============================================================
-- 4. lesson_summaries
-- ============================================================
create table public.lesson_summaries (
  lesson_id      uuid primary key references public.lessons(id) on delete cascade,
  body_markdown  text not null default '',
  updated_at     timestamptz not null default now()
);

create trigger lesson_summaries_set_updated_at
  before update on public.lesson_summaries
  for each row
  execute function public.set_updated_at();

alter table public.lesson_summaries enable row level security;

create policy "lesson_summaries_select_authenticated"
  on public.lesson_summaries
  for select
  to authenticated
  using (true);

create policy "lesson_summaries_insert_admin"
  on public.lesson_summaries
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "lesson_summaries_update_admin"
  on public.lesson_summaries
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "lesson_summaries_delete_admin"
  on public.lesson_summaries
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- ============================================================
-- 5. user_permissions
-- ============================================================
create table public.user_permissions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  page       text not null check (page in ('lessons', 'exercises', 'summaries')),
  created_at timestamptz not null default now(),
  primary key (user_id, page)
);

create index user_permissions_user_idx on public.user_permissions (user_id);

alter table public.user_permissions enable row level security;

-- Student: SELECT own rows (to know which pages are blocked)
create policy "user_permissions_select_own"
  on public.user_permissions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admin: SELECT all rows
create policy "user_permissions_select_admin"
  on public.user_permissions
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Admin: INSERT (grant a denial — add a row to block a page)
create policy "user_permissions_insert_admin"
  on public.user_permissions
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Admin: DELETE (restore access — remove the blocking row)
create policy "user_permissions_delete_admin"
  on public.user_permissions
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- No UPDATE policy on user_permissions — toggle is delete + insert.
