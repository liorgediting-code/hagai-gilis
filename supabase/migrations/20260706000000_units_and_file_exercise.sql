-- 20260706000000_units_and_file_exercise.sql
-- 3-level hierarchy (modules→units→lessons), file-upload exercise storage + review.

-- ============================================================
-- 0. Wipe existing course content (throwaway test data — approved)
-- ============================================================
truncate table
  public.exercise_submissions,
  public.exercises,
  public.lesson_progress,
  public.lesson_unlocks,
  public.lesson_summaries,
  public.lessons,
  public.modules
  restart identity cascade;

-- ============================================================
-- 1. units  (יחידה) — sits between modules (נושא) and lessons (שיעור)
-- ============================================================
create table public.units (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  title        text not null,
  description  text,
  order_index  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index units_module_order_idx on public.units (module_id, order_index);

create trigger units_set_updated_at
  before update on public.units
  for each row
  execute function public.set_updated_at();

alter table public.units enable row level security;

create policy "units_select_authenticated"
  on public.units for select to authenticated using (true);

create policy "units_insert_admin"
  on public.units for insert to authenticated
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "units_update_admin"
  on public.units for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "units_delete_admin"
  on public.units for delete to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- 2. lessons: reparent module_id -> unit_id
-- ============================================================
drop index if exists public.lessons_module_order_idx;
alter table public.lessons drop column module_id;
alter table public.lessons add column unit_id uuid not null references public.units(id) on delete cascade;
create index lessons_unit_order_idx on public.lessons (unit_id, order_index);

-- ============================================================
-- 3. exercise_submissions: admin can review (set passed) any submission
-- ============================================================
create policy "exercise_submissions_update_admin"
  on public.exercise_submissions for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- 4. Storage bucket for file-upload exercises (private)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('exercise-uploads', 'exercise-uploads', false)
on conflict (id) do nothing;

-- Path convention: exercise-uploads/{exercise_id}/{user_id}/{filename}
-- foldername(name)[1] = exercise_id, [2] = user_id

create policy "exercise_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exercise-uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "exercise_uploads_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exercise-uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "exercise_uploads_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exercise-uploads'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "exercise_uploads_select_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exercise-uploads'
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

create policy "exercise_uploads_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exercise-uploads'
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
