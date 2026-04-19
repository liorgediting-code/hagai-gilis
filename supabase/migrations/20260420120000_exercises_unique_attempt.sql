-- 0004b_exercises_unique_attempt.sql
alter table public.exercise_submissions
  add constraint exercise_submissions_user_exercise_attempt_unique
  unique (user_id, exercise_id, attempt_number);
