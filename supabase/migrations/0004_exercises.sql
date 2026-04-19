-- 0004_exercises.sql

-- ============================================================
-- 1. exercises
-- ============================================================
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  title         text not null,
  description   text,
  order_index   int not null default 0,
  content_json  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index exercises_lesson_order_idx on public.exercises (lesson_id, order_index);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row
  execute function public.set_updated_at();

alter table public.exercises enable row level security;

create policy "exercises_select_authenticated"
  on public.exercises for select to authenticated using (true);

create policy "exercises_insert_admin"
  on public.exercises for insert to authenticated
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "exercises_update_admin"
  on public.exercises for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "exercises_delete_admin"
  on public.exercises for delete to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- 2. exercise_submissions
-- ============================================================
create table public.exercise_submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  attempt_number  int not null default 1,
  answer_data     jsonb,
  submitted_at    timestamptz not null default now()
);

create index exercise_submissions_user_idx on public.exercise_submissions (user_id);
create index exercise_submissions_exercise_idx on public.exercise_submissions (exercise_id);

alter table public.exercise_submissions enable row level security;

create policy "exercise_submissions_select_own"
  on public.exercise_submissions for select to authenticated
  using (user_id = auth.uid());

create policy "exercise_submissions_insert_own"
  on public.exercise_submissions for insert to authenticated
  with check (user_id = auth.uid());

create policy "exercise_submissions_select_admin"
  on public.exercise_submissions for select to authenticated
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
