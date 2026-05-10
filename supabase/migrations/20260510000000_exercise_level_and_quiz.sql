-- supabase/migrations/20260510000000_exercise_level_and_quiz.sql

-- lessons: pass threshold per lesson
ALTER TABLE public.lessons ADD COLUMN pass_threshold int NOT NULL DEFAULT 70;

-- exercises: difficulty level
ALTER TABLE public.exercises ADD COLUMN level int NOT NULL DEFAULT 1
  CHECK (level IN (1, 2, 3));
CREATE INDEX exercises_lesson_level_idx ON public.exercises (lesson_id, level);

-- exercise_submissions: grading fields
ALTER TABLE public.exercise_submissions ADD COLUMN passed boolean;
ALTER TABLE public.exercise_submissions ADD COLUMN score_pct int; -- 0-100, null for legacy

-- lesson_unlocks: admin manual overrides
CREATE TABLE public.lesson_unlocks (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  unlocked_by  uuid REFERENCES auth.users(id),
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.lesson_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_unlocks_select_own" ON public.lesson_unlocks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "lesson_unlocks_select_admin" ON public.lesson_unlocks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "lesson_unlocks_insert_admin" ON public.lesson_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "lesson_unlocks_delete_admin" ON public.lesson_unlocks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- market_posts: author_id is nullable to support ON DELETE SET NULL
CREATE TABLE public.market_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  image_url  text,
  author_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.market_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_posts_select_authenticated" ON public.market_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "market_posts_insert_admin" ON public.market_posts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "market_posts_update_admin" ON public.market_posts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "market_posts_delete_admin" ON public.market_posts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- user_permissions: add 'market' to allowed pages
ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_page_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_page_check
  CHECK (page IN ('lessons', 'exercises', 'summaries', 'market'));

-- Data migration: wrap single-question multiple_choice -> quiz format
UPDATE public.exercises
SET content_json = jsonb_build_object(
  'type',              'multiple_choice',
  'candles',           content_json->'candles',
  'support_levels',    content_json->'support_levels',
  'resistance_levels', content_json->'resistance_levels',
  'timeframe',         content_json->>'timeframe',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question',             content_json->>'question',
      'options',              content_json->'options',
      'correct_option_index', (content_json->>'correct_option_index')::int,
      'explanation',          content_json->>'explanation'
    )
  )
)
WHERE content_json->>'type' = 'multiple_choice'
  AND content_json->'questions' IS NULL;
