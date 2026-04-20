-- Fix infinite recursion in RLS policies caused by admin checks that
-- query the profiles table from within profiles policies (and from policies
-- on other tables that reference profiles for admin checks).
--
-- Solution: a SECURITY DEFINER function that bypasses RLS when reading
-- profiles, so admin-check policies no longer trigger themselves.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- profiles table — drop and recreate recursive admin policies
-- ============================================================
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_admin"
  on public.profiles
  for select
  using (public.is_admin());

create policy "profiles_update_admin"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- modules
-- ============================================================
drop policy if exists "modules_select_admin" on public.modules;
drop policy if exists "modules_insert_admin" on public.modules;
drop policy if exists "modules_update_admin" on public.modules;
drop policy if exists "modules_delete_admin" on public.modules;

create policy "modules_select_admin"
  on public.modules for select
  using (public.is_admin());

create policy "modules_insert_admin"
  on public.modules for insert
  with check (public.is_admin());

create policy "modules_update_admin"
  on public.modules for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "modules_delete_admin"
  on public.modules for delete
  using (public.is_admin());

-- ============================================================
-- lessons
-- ============================================================
drop policy if exists "lessons_select_admin" on public.lessons;
drop policy if exists "lessons_insert_admin" on public.lessons;
drop policy if exists "lessons_update_admin" on public.lessons;
drop policy if exists "lessons_delete_admin" on public.lessons;

create policy "lessons_select_admin"
  on public.lessons for select
  using (public.is_admin());

create policy "lessons_insert_admin"
  on public.lessons for insert
  with check (public.is_admin());

create policy "lessons_update_admin"
  on public.lessons for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "lessons_delete_admin"
  on public.lessons for delete
  using (public.is_admin());

-- ============================================================
-- lesson_progress
-- ============================================================
drop policy if exists "lesson_progress_select_admin" on public.lesson_progress;

create policy "lesson_progress_select_admin"
  on public.lesson_progress for select
  using (public.is_admin());

-- ============================================================
-- lesson_summaries
-- ============================================================
drop policy if exists "lesson_summaries_select_admin" on public.lesson_summaries;
drop policy if exists "lesson_summaries_insert_admin" on public.lesson_summaries;
drop policy if exists "lesson_summaries_update_admin" on public.lesson_summaries;
drop policy if exists "lesson_summaries_delete_admin" on public.lesson_summaries;

create policy "lesson_summaries_select_admin"
  on public.lesson_summaries for select
  using (public.is_admin());

create policy "lesson_summaries_insert_admin"
  on public.lesson_summaries for insert
  with check (public.is_admin());

create policy "lesson_summaries_update_admin"
  on public.lesson_summaries for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "lesson_summaries_delete_admin"
  on public.lesson_summaries for delete
  using (public.is_admin());

-- ============================================================
-- user_permissions
-- ============================================================
drop policy if exists "user_permissions_select_admin" on public.user_permissions;
drop policy if exists "user_permissions_insert_admin" on public.user_permissions;
drop policy if exists "user_permissions_delete_admin" on public.user_permissions;

create policy "user_permissions_select_admin"
  on public.user_permissions for select
  using (public.is_admin());

create policy "user_permissions_insert_admin"
  on public.user_permissions for insert
  with check (public.is_admin());

create policy "user_permissions_delete_admin"
  on public.user_permissions for delete
  using (public.is_admin());

-- ============================================================
-- exercises
-- ============================================================
drop policy if exists "exercises_insert_admin" on public.exercises;
drop policy if exists "exercises_update_admin" on public.exercises;
drop policy if exists "exercises_delete_admin" on public.exercises;

create policy "exercises_insert_admin"
  on public.exercises for insert
  with check (public.is_admin());

create policy "exercises_update_admin"
  on public.exercises for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "exercises_delete_admin"
  on public.exercises for delete
  using (public.is_admin());

-- ============================================================
-- exercise_submissions
-- ============================================================
drop policy if exists "exercise_submissions_select_admin" on public.exercise_submissions;

create policy "exercise_submissions_select_admin"
  on public.exercise_submissions for select
  using (public.is_admin());
