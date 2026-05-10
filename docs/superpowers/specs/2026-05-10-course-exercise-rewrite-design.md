# Design: Course & Exercise System Rewrite
**Date:** 2026-05-10  
**Status:** Approved

---

## Overview

Two-wave implementation of six feature areas: topics/lessons hierarchy, YouTube embeds, exercise flow rewrite (with level-based progression), WhatsApp contact card, real-time market posts page, and navigation updates.

---

## Wave 1: Foundation

### 1. Topics UI Rename (modules → נושאים)

**Scope:** UI labels only. The `modules` DB table stays as-is; all Hebrew-facing strings change from "מודולים" to "נושאים".

- Admin nav: "ניהול מודולים" → "ניהול נושאים"
- Admin buttons: "הוסף מודול" → "הוסף נושא"
- Student lessons page: group lessons under their נושא (topic) header instead of flat list

**Student lessons page — new layout:**
- Each נושא renders as a section header with its lessons listed below
- Progress count shown per-נושא ("X מתוך Y שיעורים הושלמו")
- Lessons within each נושא show lock icon if not yet unlocked (see lesson locking below)

### 2. YouTube Embed

**No schema change needed.** The existing `video_url` field on `lessons` stores the embed URL.

- Admin lesson form: label the field "כתובת YouTube (Embed URL)" with a helper note: "השתמש בכתובת embed — לדוגמה: https://www.youtube.com/embed/VIDEO_ID"
- Server-side utility: `parseYouTubeEmbedUrl(url: string): string` — accepts full watch URL or embed URL, always returns the embed form (`https://www.youtube.com/embed/ID`)
- `VideoPlayer` component: already uses `<iframe>`, add `youtube.com` to the `allow` attribute set. No other changes needed.

### 3. DB Schema Changes

**Migration file:** `20260510000000_exercise_level_and_quiz.sql`

#### lessons table
```sql
ALTER TABLE public.lessons ADD COLUMN pass_threshold int not null default 70;
```

#### exercises table
```sql
ALTER TABLE public.exercises ADD COLUMN level int not null default 1 
  CHECK (level IN (1, 2, 3));
CREATE INDEX exercises_lesson_level_idx ON public.exercises (lesson_id, level);
```

#### exercise_submissions table
```sql
ALTER TABLE public.exercise_submissions ADD COLUMN passed boolean;
ALTER TABLE public.exercise_submissions ADD COLUMN score_pct int; -- 0-100, null for legacy
```

#### New: lesson_unlocks table
```sql
CREATE TABLE public.lesson_unlocks (
  user_id          uuid not null references auth.users(id) on delete cascade,
  lesson_id        uuid not null references public.lessons(id) on delete cascade,
  unlocked_at      timestamptz not null default now(),
  unlocked_by      uuid references auth.users(id), -- admin's user_id
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.lesson_unlocks ENABLE ROW LEVEL SECURITY;
-- Students: read own rows
CREATE POLICY "lesson_unlocks_select_own" ON public.lesson_unlocks
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Admin: full access
CREATE POLICY "lesson_unlocks_insert_admin" ON public.lesson_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "lesson_unlocks_delete_admin" ON public.lesson_unlocks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "lesson_unlocks_select_admin" ON public.lesson_unlocks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
```

#### New: market_posts table
```sql
CREATE TABLE public.market_posts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  image_url  text,
  author_id  uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
ALTER TABLE public.market_posts ENABLE ROW LEVEL SECURITY;
-- Authenticated students can read (access gate enforced in application layer)
CREATE POLICY "market_posts_select_authenticated" ON public.market_posts
  FOR SELECT TO authenticated USING (true);
-- Admin only: write
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
```

#### user_permissions page enum extension
```sql
ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_page_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_page_check 
  CHECK (page IN ('lessons', 'exercises', 'summaries', 'market'));
```

#### Data migration: wrap existing multiple_choice exercises
```sql
-- Convert single-question multiple_choice → shared-chart quiz format
-- Chart stays at root; question text/options/answer move into questions array
UPDATE public.exercises
SET content_json = jsonb_build_object(
  'type',              'multiple_choice',
  'candles',           content_json->'candles',
  'support_levels',    content_json->'support_levels',
  'resistance_levels', content_json->'resistance_levels',
  'timeframe',         content_json->>'timeframe',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question',            content_json->>'question',
      'options',             content_json->'options',
      'correct_option_index', (content_json->>'correct_option_index')::int,
      'explanation',         content_json->>'explanation'
    )
  )
)
WHERE content_json->>'type' = 'multiple_choice'
  AND content_json->'questions' IS NULL;
```

### 4. Updated TypeScript Exercise Types

**`lib/types/exercise-types.ts`** — extend `MultipleChoiceExercise`:

```ts
// Chart data is shared across all questions in a quiz exercise
export type MultipleChoiceQuestion = {
  question: string;
  options: [string, string, string, string];
  correct_option_index: 0 | 1 | 2 | 3;
  explanation: string;
};

export type MultipleChoiceExercise = {
  type: "multiple_choice";
  // Shared chart for all questions
  candles: CandleData[];
  support_levels: PriceLine[];
  resistance_levels: PriceLine[];
  timeframe?: string;
  questions: MultipleChoiceQuestion[]; // 1 or more
};
```

### 5. Admin Exercise Wizard Updates

- **Step 1 (type):** Add "רמה" selector (1/2/3). Defaults to 1. Stored as `exercises.level`.
- **Step 4 (question):** Replaced with a question list UI:
  - The chart from Step 2 (candles, support/resistance, timeframe) is SHARED across all questions
  - Shows existing questions in the list
  - "הוסף שאלה" button adds a blank question form below
  - Each question entry: question text, options (4), correct option radio, explanation
  - Minimum 1 question required
- **Lesson form:** Add "סף מעבר (%)" number input (0–100, default 70) on the lesson create/edit form.

### 6. Admin Manual Lesson Unlock (on student detail page)

On `/admin/students/[id]`, add a "גישה לשיעורים" section:
- Table of all lessons with their lock status for this student
- Lock status computed as: auto-unlocked (first lesson or passed Level 3 of prev), manually unlocked, or locked
- "פתח שיעור" button for locked lessons — inserts into `lesson_unlocks`
- "נעל" button for manually-unlocked lessons — deletes from `lesson_unlocks`

---

## Wave 2: Student Flow + Market Posts

### 7. Exercise Progression Flow

**Route:** `/lessons/[id]/exercise` replaces the old `/exercises/[id]` pages for student access.

**Lesson unlock logic** (computed server-side):
```
isUnlocked(lesson) =
  lesson.order_index === 0
  OR lesson_unlocks row exists for (user_id, lesson_id)
  OR (prev lesson exists AND user has exercise_submission with passed=true
      for an exercise with lesson_id=prev.id AND level=3)
```

**Entering the exercise flow** (from lesson page):
1. Lesson page shows "התחל תרגול" button after video section
2. Button navigates to `/lessons/[id]/exercise`
3. Server determines current level:
   - If user has no passed Level 1 submission for this lesson → serve random Level 1 exercise
   - If Level 1 passed, no passed Level 3 → serve random Level 3 exercise (Level 1 pass skips Level 2)
   - If Level 1 failed (has submission but not passed) AND no passed Level 2 → redirect to `/lessons/[id]?retry=true` (rewatch) then serve Level 2
   - If Level 2 passed, no Level 3 passed → serve random Level 3 exercise
   - If Level 3 passed → show completion state, next lesson button
4. Random exercise selection: picks from pool of exercises at the target level where the user has no `passed=true` submission. If all exercises in pool are exhausted (all passed or all failed), picks a random one from the pool.

**Exercise page layout** (`/lessons/[id]/exercise`):
- Breadcrumb: "שיעורים → [lesson title] → תרגול"
- Level badge: "רמה 1" / "רמה 2" / "רמה 3"
- Exercise content (chart_click or multiple_choice quiz)
- Submit button

**Grading (Server Action `submitExerciseAttempt`):**
- `chart_click`: `passed = clickIsInAcceptanceZone(answer, zone)`, `score_pct = passed ? 100 : 0`
- `multiple_choice quiz`: `score_pct = (correctCount / totalQuestions) * 100`, `passed = score_pct >= lesson.pass_threshold`
- Stores result in `exercise_submissions` with `passed` + `score_pct`

**After submission:**
- Level 1 pass → "כל הכבוד! עברת לרמה הגבוהה" → button to Level 3 exercise
- Level 1 fail → "לא עברת. חזור לשיעור ונסה שנית" → button back to lesson page (with `?retry=true` flag showing rewatch prompt)
- Level 2 pass → "עברת! ממשיכים לרמה הגבוהה" → button to Level 3 exercise  
- Level 2 fail → WhatsApp card (see §8)
- Level 3 pass → "מצוין! השיעור הבא נפתח עבורך" → button to next lesson
- Level 3 fail → "לא עברת. נסה שוב" → retry with different Level 3 exercise

**Lesson page retry state** (`?retry=true`):
- Shows a banner: "חזור לצפות בשיעור ואז לחץ על 'המשך לתרגול רמה 2'"
- "המשך לתרגול רמה 2" button navigates to `/lessons/[id]/exercise` (server will route to Level 2)

### 8. WhatsApp Contact Card

Shown when Level 2 is failed. Full-width card component:
```
┌──────────────────────────────────────────────┐
│  נכשלת — אל תתייאש!                         │
│  יש לתאם שיעור עם חגי כדי לתרגל את החומר   │
│  על מנת להמשיך.                              │
│                                              │
│  [קבע שיעור עם חגי]  ← opens WhatsApp       │
└──────────────────────────────────────────────┘
```
Button: `href="https://wa.me/972525211955"`, `target="_blank"`, `rel="noopener noreferrer"`.

### 9. Standalone Exercises Route Removal

- Remove `/app/(student)/exercises/page.tsx` (the exercises list page)
- Remove `/app/(student)/exercises/[id]/page.tsx` and all its `_components` (replaced by `/lessons/[id]/exercise`)
- Remove `/app/(student)/exercises/loading.tsx`
- Update bottom tab bar (remove "תרגולים" tab — see §10)

### 10. Navigation Changes

**Bottom tab bar** (`components/_bottom-tab-bar.tsx`):
```
Before: בית | שיעורים | תרגולים | סיכומים
After:  בית | שיעורים | סיכומים | מניות
```
- Remove "תרגולים" tab
- Add "מניות" tab (href `/market`, icon `TrendingUpIcon`)
- "מניות" tab renders with a lock overlay if user has not unlocked market access

**Admin nav:** no changes to tab structure.

### 11. Market Posts Page

**Student page** `/market`:
- Access gate: check if all `lessons` have `completed_at` in `lesson_progress` for this user, OR `user_permissions` row exists for `page='market'`
- Locked: centered card with lock icon + "סיים את הקורס כדי לגשת לתוכן הזה"
- Unlocked: reverse-chronological feed of `market_posts`
  - Each post: title, body (rendered as plain text or markdown), optional image, date formatted as DD/MM/YYYY

**Admin page** `/admin/market`:
- List view of posts (newest first): title + date + edit/delete buttons
- "פרסם עדכון" button → create form
- Create/edit form fields: title (text), body (textarea), image_url (optional text)
- Server Actions: `createMarketPost`, `updateMarketPost`, `deleteMarketPost`

---

## What Does NOT Change

- Auth system (login, invite, forgot-password)
- Summaries system (lesson_summaries, `/summaries` page)
- Admin students list, student invite flow
- Admin exercises wizard structure (Step 1 type, Step 2 data, Step 3 zone — just adds Level selector to Step 1 and replaces Step 4 question UI)
- `candle-chart.tsx` component

---

## Open Questions / Assumptions

- **Level 3 fail:** Retry with a random Level 3 exercise from the pool. No WhatsApp card on Level 3 fail.
- **Single-exercise pool:** If a lesson has only one exercise per level, the same exercise is always served (no rotation possible). This is acceptable.
- **Market posts body:** Plain `<p>` rendering, no markdown parser needed yet.
- **Existing exercise_submissions:** Legacy rows without `passed`/`score_pct` are treated as "not passed" for unlock calculations.
