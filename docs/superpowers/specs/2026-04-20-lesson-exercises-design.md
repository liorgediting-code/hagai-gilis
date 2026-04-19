# תרגולי שיעורים — Lesson Exercises Feature Design

Date: 2026-04-20  
Status: Approved by user

---

## Overview

Add a "תרגולי שיעורים" (Lesson Exercises) section to the student-facing PWA. Each lesson has multiple chart-based exercises where students demonstrate what they learned (e.g., identify a false breakout on a candlestick chart). Hagai (admin) can track every student's progress and all their attempts per exercise to assess their level.

---

## Database Schema

### `exercises` table

```sql
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  title         text not null,
  description   text,
  order_index   int not null default 0,
  content_json  jsonb,        -- null now; will hold chart config when built
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

- RLS: SELECT for all authenticated users; INSERT/UPDATE/DELETE for admin only (profiles subquery pattern).

### `exercise_submissions` table

```sql
create table public.exercise_submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  attempt_number  int not null default 1,
  answer_data     jsonb,       -- null now; will hold chart annotations when built
  submitted_at    timestamptz not null default now()
);
```

- Every submission is a new row — history is never overwritten.
- `attempt_number` increments per (user_id, exercise_id) pair.
- RLS: student SELECTs/INSERTs own rows only; admin SELECTs all rows.

### Locking mechanism

An exercise is accessible when `lesson_progress.completed_at IS NOT NULL` for that lesson and user. No separate lock column — derived at query time.

### Existing `user_permissions` compatibility

The `user_permissions.page` check constraint already includes `'exercises'`, so per-student page blocking works without a migration change.

---

## Student Pages

### `/exercises` — List page

- Navigation: דף הבית / שיעורים / **תרגולי שיעורים** / סיכומים
- Accordion layout: one row per lesson, expandable to show its exercises
- Lesson locked (no `completed_at`): row shown at 45% opacity, arrow removed, hint text: "צפה בשיעור וסמן 'סיימתי לצפות' כדי לפתוח את התרגולים"
- Lesson open: exercises listed inside with badge — "הושלם ✓" (blue) or "התחל ←" (green)
- Each exercise row links to `/exercises/[id]`
- Permission gate: if `user_permissions` blocks `'exercises'` for this user, show blocked banner (same pattern as lessons/summaries)

### `/exercises/[id]` — Exercise page

- Header: back arrow → `/exercises`, exercise title, lesson name
- Blue instruction box: task description (from `exercises.description`)
- Chart area: placeholder `<div>` now ("גרף אינטראקטיבי — ייבנה בשלב הבא"); interactive chart component plugged in later without schema changes
- Buttons: "איפוס" (ghost) + "שלח תשובה" (primary blue)
- On submit: inserts a row into `exercise_submissions`, shows toast "נשלח בהצלחה", badge on list page updates to "הושלם"
- Student can submit multiple times ("נסה שוב" button appears after first submission) — all attempts saved

---

## Admin Pages

### `/admin/exercises` — Progress overview

- Table: one row per student — name, exercises completed / total, completion percentage
- Clicking a student row opens a drill-down showing per-lesson / per-exercise breakdown
- Each exercise shows: all attempts in chronological order, `attempt_number`, `submitted_at`, and `answer_data` (raw JSON now; rendered visually when chart is built)
- Allows Hagai to see how many tries a student needed, whether they self-corrected, and where they're struggling
- Server Component; admin role verified server-side before rendering

---

## Seed Data (placeholders)

Migration adds 2–3 placeholder exercises per existing lesson:
- `content_json: null` (chart config TBD)
- Titles and descriptions in Hebrew describing real trading concepts (e.g., "זיהוי פריצת שווא", "שרטוט קו מגמה עולה")

---

## What is deferred

- Interactive chart component (SVG/canvas, built together in a future step)
- `answer_data` rendering in admin view (shown as raw JSON until chart is built)
- Admin ability to mark a submission as "correct" / provide feedback (future step)

---

## Files to create / modify

| File | Action |
|------|--------|
| `supabase/migrations/0004_exercises.sql` | New — exercises + exercise_submissions tables, RLS |
| `supabase/migrations/0005_seed_exercises.sql` | New — placeholder exercises per lesson |
| `app/(student)/exercises/page.tsx` | New — accordion list |
| `app/(student)/exercises/[id]/page.tsx` | New — exercise detail page |
| `app/(student)/exercises/[id]/actions.ts` | New — submitExercise Server Action |
| `app/(student)/layout.tsx` | Modify — add "תרגולי שיעורים" nav link with permission check |
| `app/admin/exercises/page.tsx` | New — admin progress overview |
| `app/admin/exercises/[userId]/page.tsx` | New — per-student drill-down |
| `lib/types/database.ts` | Regenerate after migration |
