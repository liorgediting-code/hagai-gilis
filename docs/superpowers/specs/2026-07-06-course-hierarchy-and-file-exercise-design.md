# Design: 3-Level Course Hierarchy + File-Upload Exercise

**Date:** 2026-07-06
**Status:** Approved (pending spec review)
**Author:** main thread + Hagai (user)

## Goal

Give the admin (Hagai) a 3-level course structure and a new file-submission exercise:

1. A 3-level course hierarchy — **נושא (Topic) → יחידה (Unit) → שיעור (Lesson)** — that the admin fully manages (create / edit / delete at every level, with name, description, and YouTube link on lessons).
2. A new **file-upload exercise**: the student uploads file(s); the submission is stored so the admin can see, per student, what each one submitted. Each such exercise shows admin-authored **instructions** above it.
3. Ability to **attach an exercise to a lesson** (already exists via the exercise wizard — the new type plugs into it).

Reference structure the user gave:

```
נושא: תמיכה והתנגדות
  יחידה 1:
    3 שיעורים
```

## Current state (as-is)

- **Hierarchy is 2-level**: `modules` (top) → `lessons`. No units layer.
  - `modules`: `id, title, description, order_index, timestamps`
  - `lessons`: `id, module_id (FK→modules), title, description, video_url (YouTube embed), order_index, pass_threshold, timestamps`
- **Exercises** (`exercises`): attached to a lesson via `lesson_id`. `content_json` holds config + answer key. Types today: `chart_click`, `multiple_choice`. No `instructions` field rendered to students.
- **Submissions** (`exercise_submissions`): `user_id, exercise_id, attempt_number, answer_data (jsonb), passed (bool|null), score_pct (int|null), submitted_at`.
- **No Supabase Storage** configured anywhere. No file-upload of any kind.
- **Admin UI** exists for modules, lessons (title/description/video_url/order/pass_threshold), exercises (wizard incl. lesson selection), summaries, market, students.
- **Course content currently in the DB is throwaway test data** — safe to wipe.

Key file anchors:
- Migrations: `supabase/migrations/0002_courses.sql`, `0004_exercises.sql`, `20260510000000_exercise_level_and_quiz.sql`
- Types: `lib/types/course-types.ts`, `lib/types/exercise-types.ts`, `lib/types/database.ts` (generated)
- Admin: `app/admin/modules/`, `app/admin/lessons/`, `app/admin/exercises/`, `app/admin/students/`
- Lesson form: `app/admin/lessons/_components/lesson-form.tsx`
- YouTube util: `lib/utils/youtube.ts`
- Student exercise flow: `app/(student)/lessons/[id]/exercise/`

## Decisions (locked with user)

- **Hierarchy**: add a Units layer; **wipe existing course content** and rebuild fresh (no data backfill).
- **Table naming**: keep the physical table `modules` as the Topic (נושא); relabel UI only. Avoids a rename cascade across RLS/types/many files. Documented mapping: `modules == נושא (Topic)`.
- **File-upload grading**: per-exercise admin toggle — `manual_review` (admin marks pass/fail) OR `auto_complete` (passes on upload).
- **Accepted files**: images + PDF.
- **Files per submission**: admin sets a required count per exercise (`required_files`).
- **Instructions field**: scoped to the file-upload exercise only (lives in its `content_json.instructions`).
- **Admin review surfaces**: BOTH — per-exercise (list students) AND per-student (list submissions).

## Data model changes

### New table: `units`

```sql
create table units (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references modules(id) on delete cascade,
  title        text not null,
  description  text,
  order_index  int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table units enable row level security;
```

RLS policies (mirroring existing `modules`/`lessons` policy shape):
- **SELECT**: any authenticated user (students read the whole tree).
- **INSERT / UPDATE / DELETE**: admin only, via the `profiles` subquery
  `EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')`.

Index: `create index on units(module_id, order_index);`

### `lessons`: reparent to units

- Drop `module_id`, add `unit_id uuid not null references units(id) on delete cascade`.
- Because course content is wiped, this is done as a clean drop/add (no backfill). The migration truncates course content first (see below).

### Wipe course content

In the migration, before/around the schema change, clear existing course rows so the reparenting is clean and no orphan data remains:

```sql
truncate exercise_submissions, exercises, lesson_progress, lesson_unlocks,
         lesson_summaries, lessons, units, modules restart identity cascade;
```

(Truncate order / `cascade` handles FKs. `units` included for idempotency even though empty on first run.)

### Storage bucket: `exercise-uploads`

- Private bucket (not public).
- Path convention: `exercise-uploads/{exercise_id}/{user_id}/{submission_id}/{filename}`.
- Storage RLS policies on `storage.objects` for this bucket:
  - **INSERT**: authenticated user may upload only under a prefix whose second path segment equals their own `auth.uid()`.
  - **SELECT**: the owning student (own `auth.uid()` in the path) OR admin (`profiles` subquery).
  - **DELETE**: owning student (to support replace before review) OR admin.
- Accepted MIME types enforced in the Server Action (belt) and client input `accept` (suspenders): `image/*`, `application/pdf`.

### `exercise_submissions`: admin review

- Reuse the table as-is for file submissions:
  - `answer_data = { files: [{ path, name, mime, size }] }`
  - `passed`: `null` = ממתין לבדיקה (manual mode, ungraded) · `true`/`false` after review · `true` immediately for `auto_complete`.
  - `score_pct`: unused for file exercises (leave `null`).
- Add an **admin UPDATE policy** so the admin can set `passed` on any student's submission (students already own their rows for insert/select). Admin update via `profiles` subquery.

## Exercise type: `file_upload`

Add to `lib/types/exercise-types.ts` (zod + TS), and to `exerciseContentSchema` union:

```ts
type FileUploadExercise = {
  type: 'file_upload';
  instructions: string;                 // Hebrew, rendered above the uploader
  required_files: number;               // >= 1, admin-set
  completion_mode: 'manual_review' | 'auto_complete';
};
```

- Answer shape (student submission `answer_data`):
  `{ files: Array<{ path: string; name: string; mime: string; size: number }> }`
- Validation: exactly / at least `required_files` files (require **at least** `required_files`); each file mime in {image/*, application/pdf}.

## Server Actions

All follow the project contract: `"use server"`, zod-validated inputs, `{ success: true, data } | { success: false, error }`, `revalidatePath` after mutation, admin re-check server-side.

### Units — `app/admin/units/actions.ts` (new)
- `createUnitAction(moduleId, { title, description, order_index })`
- `updateUnitAction(unitId, { ... })`
- `deleteUnitAction(unitId)`

### Lessons — `app/admin/lessons/actions.ts` (edit)
- Change create/update to take `unit_id` instead of `module_id`. YouTube parsing unchanged.

### File-upload exercise
- Creation flows through the existing exercise wizard (`app/admin/exercises/`): add `file_upload` as a selectable type with fields instructions / required_files / completion_mode. Lesson attachment already handled by the wizard's lesson-selection step.
- **Student submit** — `app/(student)/lessons/[id]/exercise/actions.ts` (or the existing submit action): `submitFileUploadAction(exerciseId, files[])`:
  1. Validate count + mime server-side.
  2. Upload each file to `exercise-uploads/...` via server client.
  3. Insert `exercise_submissions` row with `answer_data.files` and `passed` = (`auto_complete` ? true : null).
  4. If it results in `passed = true`, the existing lesson-completion / unlock path applies (same gate the other exercise types use).
- **Admin review** — `reviewFileSubmissionAction(submissionId, passed: boolean)`: sets `passed`; if it flips to `true`, downstream unlock logic reflects it. `revalidatePath` the review pages.

## UI

### Admin — hierarchy
- `/admin/modules` — Topics list. Relabel Hebrew strings to נושא/נושאים. CRUD (exists).
- **NEW** `/admin/modules/[id]/units/page.tsx` — Units under a topic + `unit-form` (title, description, order). Create/edit/delete.
- `/admin/units/[id]/lessons/page.tsx` — Lessons under a unit; reuse `lesson-form.tsx` (title, description, YouTube `video_url`, order, pass_threshold), parent = unit. (Move/replace the current `/admin/modules/[id]/lessons` route.)
- Breadcrumbs reflect Topic → Unit → Lesson.

### Admin — file submissions
- **NEW** `/admin/exercises/[id]/submissions/page.tsx` — for a `file_upload` exercise: table of students × their file(s) (download links), status badge (ממתין לבדיקה / עבר / נכשל), pass/fail control (calls `reviewFileSubmissionAction`). Only meaningful for file-upload exercises.
- `/admin/students/[id]` — add a "הגשות קבצים" section listing that student's file submissions across exercises, with the same status + pass/fail control.

### Student
- Course browsing gains the Unit layer: Topic page lists Units; Unit lists Lessons. (Update the existing course/module browse pages to route through units.)
- **NEW** file-upload exercise component under `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx`:
  - Renders `instructions` (Hebrew, RTL) at the top.
  - Drag/drop + file picker (`accept="image/*,application/pdf"`), enforces `required_files`.
  - Shows upload progress, selected files, and current status after submit.
  - Allows replacing files before admin review (delete + re-upload) where `passed` is still `null`.

## RTL / Hebrew

- All new strings in Hebrew (נושא, יחידה, שיעור, הוראות, העלאת קובץ, ממתין לבדיקה, עבר, נכשל, הורדה, etc.).
- Logical CSS utilities only (`ms/me/ps/pe/start/end/text-start`). No physical L/R.
- Uploader and lists mobile-first (375px), tap targets ≥ 44px.
- Dates `DD/MM/YYYY`, Western digits.

## Security checklist

- RLS enabled on `units` with admin-only writes (profiles subquery), authenticated reads.
- Storage bucket private; per-user path-scoped insert/select/delete + admin read-all.
- `exercise_submissions` admin UPDATE policy for review; students keep own-row insert/select.
- File type + count validated server-side in the Server Action (never trust client).
- No `service_role` in client code. Uploads go through the server client / Server Action.
- Regenerate `lib/types/database.ts` (`pnpm run db:types`) after the migration.

## Testing / verification

- Migration applies cleanly; `units` present, `lessons.unit_id` FK correct, course content empty.
- Admin can CRUD Topic → Unit → Lesson end to end, with YouTube link on a lesson.
- Admin creates a `file_upload` exercise (both completion modes) attached to a lesson.
- Student uploads images + PDF; count enforcement works; wrong types rejected.
- `auto_complete` → submission `passed = true`, lesson practice completes.
- `manual_review` → `passed = null`; admin marks pass/fail from both the per-exercise and per-student views; state updates.
- Storage: student can read only own files; admin reads all; another student cannot.
- Auditor sweep: supabase-rls-checker, code-reviewer, rtl-auditor all clean.

## Implementation phases (for the plan)

1. **Migration + storage** — `units` table + RLS, reparent `lessons`, wipe content, `exercise-uploads` bucket + storage policies, `exercise_submissions` admin-update policy. Then `pnpm run db:types`.
2. **Types** — `units` row types (`course-types.ts`); `file_upload` in `exercise-types.ts` + schema union.
3. **Admin hierarchy UI** — units CRUD pages/forms; reparent lessons routes/actions to units; relabel Topics.
4. **File-upload exercise** — wizard support (create), student upload component + submit action + storage upload.
5. **Admin review** — per-exercise submissions page + per-student section + `reviewFileSubmissionAction`.
6. **Student browsing** — thread the Unit layer through course/lesson navigation.
7. **Audit** — parallel rls-checker + code-reviewer + rtl-auditor; fix findings.

## Out of scope (YAGNI)

- Renaming `modules` → `topics` at the DB level.
- Instructions field on chart/quiz exercise types.
- Auto-grading of file contents; scoring for file exercises.
- Multiple submission versioning/history beyond replace-before-review.
- Bunny.net video (still deferred).
