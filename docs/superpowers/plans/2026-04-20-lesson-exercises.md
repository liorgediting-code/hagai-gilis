# Lesson Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "תרגולי שיעורים" section with chart-based exercises per lesson — student list page, exercise detail page (placeholder chart), Server Action to record every attempt, and admin progress view.

**Architecture:** Two new Supabase tables (`exercises`, `exercise_submissions`). Student-facing accordion list at `/exercises`, full-page exercise at `/exercises/[id]`. Locking derived from `lesson_progress.completed_at`. Admin view at `/admin/exercises` with per-student drill-down showing every submission attempt.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase/Postgres, TypeScript strict, Tailwind + shadcn/ui, zod, react-hook-form (not needed here — plain `useActionState`), Heebo/Assistant fonts.

---

## File Map

| File | Action |
|------|--------|
| `supabase/migrations/0004_exercises.sql` | Create — exercises + exercise_submissions tables + RLS |
| `supabase/migrations/0005_seed_exercises.sql` | Create — 2–3 placeholder exercises per lesson |
| `lib/types/course-types.ts` | Modify — add `ExerciseRow`, `ExerciseSubmissionRow` |
| `app/(student)/exercises/page.tsx` | Create — accordion list page |
| `app/(student)/exercises/[id]/page.tsx` | Create — exercise detail page |
| `app/(student)/exercises/[id]/actions.ts` | Create — `submitExerciseAction` Server Action |
| `app/(student)/exercises/[id]/_components/submit-exercise-button.tsx` | Create — client submit button |
| `app/(student)/layout.tsx` | Modify — add "תרגולי שיעורים" nav link |
| `app/admin/exercises/page.tsx` | Create — all-students progress overview |
| `app/admin/exercises/[userId]/page.tsx` | Create — per-student drill-down with all attempts |
| `app/admin/_components/admin-nav.tsx` | Modify — add exercises nav link |

---

## Task 1: Migration — exercises + exercise_submissions tables

**Files:**
- Create: `supabase/migrations/0004_exercises.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply migration locally**

```bash
pnpm supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Apply to remote**

```bash
pnpm supabase db push --linked
```

Expected: no errors.

- [ ] **Step 4: Regenerate types**

```bash
pnpm run db:types
```

Expected: `lib/types/database.ts` updated with `exercises` and `exercise_submissions` entries.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_exercises.sql lib/types/database.ts
git commit -m "feat(db): add exercises and exercise_submissions tables | הוספת טבלאות תרגולים"
```

---

## Task 2: Seed placeholder exercises

**Files:**
- Create: `supabase/migrations/0005_seed_exercises.sql`

- [ ] **Step 1: Write the seed migration**

```sql
-- 0005_seed_exercises.sql
-- 2 placeholder exercises per lesson (fixed UUIDs, idempotent)

insert into public.exercises (id, lesson_id, title, description, order_index)
values
  -- שיעור 1: איתור מניות
  ('bbbbbbbb-0101-0101-0101-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
   'זיהוי מניה לפני תנועה', 'סמן על הגרף את הנקודה שבה המניה מראה סימני לחץ קדם-פיצוץ.', 1),
  ('bbbbbbbb-0102-0102-0102-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
   'השוואת מניות פוטנציאליות', 'מצא מבין שני הגרפים את זה עם הפוטנציאל הגבוה יותר וסמן מדוע.', 2),

  -- שיעור 2: תמיכה והתנגדות
  ('bbbbbbbb-0201-0201-0201-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
   'סימון אזור תמיכה', 'שרטט את אזור התמיכה המשמעותי ביותר על הגרף.', 1),
  ('bbbbbbbb-0202-0202-0202-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
   'סימון אזור התנגדות', 'שרטט את אזור ההתנגדות שהמחיר נדחה ממנו שוב ושוב.', 2),

  -- שיעור 3: ווליום קיצוני
  ('bbbbbbbb-0301-0301-0301-bbbbbbbbbbbb', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
   'זיהוי ווליום חריג', 'סמן את הנר שבו הווליום חריג ביחס לממוצע.', 1),
  ('bbbbbbbb-0302-0302-0302-bbbbbbbbbbbb', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
   'כניסת שחקן גדול', 'על הגרף — היכן לדעתך נכנס שחקן מוסדי? סמן וכתוב הסבר קצר.', 2),

  -- שיעור 4: פריצות שווא
  ('bbbbbbbb-0401-0401-0401-bbbbbbbbbbbb', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
   'זיהוי פריצת שווא', 'סמן על הגרף היכן התרחשה פריצת השווא.', 1),
  ('bbbbbbbb-0402-0402-0402-bbbbbbbbbbbb', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
   'פריצה אמיתית מול שווא', 'הגרף מציג שתי פריצות. סמן איזו אמיתית ואיזו שווא.', 2),

  -- שיעור 5: מגמה כללית
  ('bbbbbbbb-0501-0501-0501-bbbbbbbbbbbb', 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
   'קריאת מגמת השוק', 'שרטט קו מגמה המייצג את כיוון השוק על הגרף.', 1),
  ('bbbbbbbb-0502-0502-0502-bbbbbbbbbbbb', 'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
   'התאמת כיוון עסקה', 'על פי המגמה בגרף — סמן האם תיכנס לונג או שורט ומדוע.', 2),

  -- שיעור 6: שינוי מומנטום
  ('bbbbbbbb-0601-0601-0601-bbbbbbbbbbbb', 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
   'נקודת היפוך מומנטום', 'סמן את הנקודה המדויקת שבה המומנטום התהפך.', 1),
  ('bbbbbbbb-0602-0602-0602-bbbbbbbbbbbb', 'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
   'אות כניסה או יציאה?', 'על פי שינוי המומנטום בגרף — האם זה אות כניסה או יציאה? סמן.', 2),

  -- שיעור 7: נקודת כניסה
  ('bbbbbbbb-0701-0701-0701-bbbbbbbbbbbb', 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
   'הצבת פקודת כניסה', 'סמן על הגרף את נקודת הכניסה המדויקת לעסקה.', 1),
  ('bbbbbbbb-0702-0702-0702-bbbbbbbbbbbb', 'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
   'פרמטרים מלאים לעסקה', 'על הגרף — סמן כניסה, סטופ-לוס ויעד רווח.', 2)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply locally then to remote**

```bash
pnpm supabase db push && pnpm supabase db push --linked
```

Expected: no errors, 14 rows inserted.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_seed_exercises.sql
git commit -m "feat(db): seed placeholder exercises per lesson | זריעת תרגולי placeholder"
```

---

## Task 3: Add TypeScript row types

**Files:**
- Modify: `lib/types/course-types.ts`

- [ ] **Step 1: Append the two new types** (add after `UserPermissionRow`):

```typescript
export type ExerciseRow = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  order_index: number;
  content_json: unknown | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseSubmissionRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  attempt_number: number;
  answer_data: unknown | null;
  submitted_at: string;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types/course-types.ts
git commit -m "feat(types): add ExerciseRow and ExerciseSubmissionRow | הוספת טיפוסי תרגולים"
```

---

## Task 4: Student exercises list page

**Files:**
- Create: `app/(student)/exercises/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import Link from "next/link";
import { DumbbellIcon, ChevronDownIcon, LockIcon, CheckCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

export default async function ExercisesPage() {
  await requirePageAccess("exercises");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: lessons },
    { data: exercises },
    { data: progress },
    { data: submissions },
  ] = await Promise.all([
    db.from("lessons").select("*").order("order_index") as unknown as Promise<{ data: LessonRow[] | null; error: unknown }>,
    db.from("exercises").select("*").order("order_index") as unknown as Promise<{ data: ExerciseRow[] | null; error: unknown }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as unknown as Promise<{ data: LessonProgressRow[] | null; error: unknown }>,
    db.from("exercise_submissions").select("exercise_id").eq("user_id", user.id) as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "exercise_id">[] | null; error: unknown }>,
  ]);

  const allLessons = lessons ?? [];
  const allExercises = exercises ?? [];

  const completedLessonIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );
  const submittedExerciseIds = new Set((submissions ?? []).map((s) => s.exercise_id));

  const exercisesByLesson = new Map<string, ExerciseRow[]>();
  for (const ex of allExercises) {
    if (!exercisesByLesson.has(ex.lesson_id)) exercisesByLesson.set(ex.lesson_id, []);
    exercisesByLesson.get(ex.lesson_id)!.push(ex);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DumbbellIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">תרגולי שיעורים</h1>
      </div>

      {allLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין שיעורים. חזור בקרוב.</p>
      ) : (
        <div className="space-y-3">
          {allLessons.map((lesson, idx) => {
            const lessonExercises = exercisesByLesson.get(lesson.id) ?? [];
            const isUnlocked = completedLessonIds.has(lesson.id);
            const doneCount = lessonExercises.filter((ex) => submittedExerciseIds.has(ex.id)).length;

            return (
              <Card key={lesson.id} className={isUnlocked ? "" : "opacity-50"}>
                <CardHeader className="border-b border-border/50 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-xs font-bold text-primary-foreground">
                      {idx + 1}
                    </span>
                    <CardTitle className="flex-1 text-sm font-semibold text-foreground">
                      {lesson.title}
                    </CardTitle>
                    {isUnlocked ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {doneCount}/{lessonExercises.length} הושלמו
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                        <LockIcon className="size-3" aria-hidden="true" />
                        נעול
                      </span>
                    )}
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                </CardHeader>

                {isUnlocked && lessonExercises.length > 0 && (
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border/30">
                      {lessonExercises.map((ex) => {
                        const done = submittedExerciseIds.has(ex.id);
                        return (
                          <li key={ex.id}>
                            <Link
                              href={`/exercises/${ex.id}`}
                              className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                            >
                              <span
                                className="flex size-6 shrink-0 items-center justify-center"
                                aria-label={done ? "הושלם" : "פתוח"}
                              >
                                {done ? (
                                  <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
                                ) : (
                                  <span className="size-5 rounded-full border-2 border-muted-foreground/30 block" />
                                )}
                              </span>
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium text-foreground">{ex.title}</p>
                                {ex.description && (
                                  <p className="truncate text-xs text-muted-foreground">{ex.description}</p>
                                )}
                              </div>
                              {done && (
                                <span className="shrink-0 text-xs font-medium text-primary">הושלם</span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                )}

                {!isUnlocked && (
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground">
                      צפה בשיעור וסמן &quot;סמן כהושלם&quot; כדי לפתוח את התרגולים.
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/exercises/page.tsx
git commit -m "feat(student): exercises list page with accordion per lesson | דף רשימת תרגולים"
```

---

## Task 5: Submit exercise Server Action

**Files:**
- Create: `app/(student)/exercises/[id]/actions.ts`

- [ ] **Step 1: Create the action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import type { ActionState } from "@/app/(auth)/actions";
import type { ExerciseSubmissionRow } from "@/lib/types/course-types";

const submitSchema = z.object({
  exercise_id: z.string().uuid("מזהה תרגול לא תקין"),
});

export async function submitExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = submitSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());

  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exercise_id)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: Pick<ExerciseSubmissionRow, "attempt_number">[] | null; error: unknown };

  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const { error } = (await supabase
    .from("exercise_submissions")
    .insert({
      user_id: user.id,
      exercise_id: parsed.data.exercise_id,
      attempt_number: nextAttempt,
      answer_data: null,
    })) as { data: unknown; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בשמירת התשובה — נסה שנית" };
  }

  revalidatePath(`/exercises/${parsed.data.exercise_id}`);
  revalidatePath("/exercises");
  return { status: "success" };
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/exercises/\[id\]/actions.ts
git commit -m "feat(student): submitExerciseAction server action | אקשן שמירת תרגול"
```

---

## Task 6: Submit exercise client button

**Files:**
- Create: `app/(student)/exercises/[id]/_components/submit-exercise-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useActionState } from "react";
import { CheckCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface SubmitExerciseButtonProps {
  exerciseId: string;
  hasSubmitted: boolean;
}

const initialState: ActionState = { status: "idle" };

export function SubmitExerciseButton({ exerciseId, hasSubmitted }: SubmitExerciseButtonProps) {
  const [state, formAction, isPending] = useActionState(submitExerciseAction, initialState);

  const submitted = hasSubmitted || state.status === "success";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" className="min-h-11">
          איפוס
        </Button>
        <form action={formAction}>
          <input type="hidden" name="exercise_id" value={exerciseId} />
          <Button type="submit" disabled={isPending} className="min-h-11">
            {isPending ? "שולח..." : submitted ? "שלח שוב" : "שלח תשובה"}
          </Button>
        </form>
      </div>

      {submitted && state.status === "success" && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3">
          <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-primary">נשלח בהצלחה!</span>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/exercises/\[id\]/_components/submit-exercise-button.tsx
git commit -m "feat(student): SubmitExerciseButton client component | כפתור שליחת תרגול"
```

---

## Task 7: Student exercise detail page

**Files:**
- Create: `app/(student)/exercises/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitExerciseButton } from "./_components/submit-exercise-button";
import type { ExerciseRow, LessonRow, LessonProgressRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

interface ExercisePageProps {
  params: Promise<{ id: string }>;
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  await requirePageAccess("exercises");
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: exercise } = (await db
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single()) as { data: ExerciseRow | null; error: unknown };

  if (!exercise) notFound();

  const { data: lesson } = (await db
    .from("lessons")
    .select("id, title")
    .eq("id", exercise.lesson_id)
    .single()) as { data: Pick<LessonRow, "id" | "title"> | null; error: unknown };

  const { data: progress } = (await db
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", exercise.lesson_id)
    .maybeSingle()) as { data: Pick<LessonProgressRow, "completed_at"> | null; error: unknown };

  if (!progress?.completed_at) notFound();

  const { data: submissions } = (await db
    .from("exercise_submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("exercise_id", id)
    .limit(1)) as { data: Pick<ExerciseSubmissionRow, "id">[] | null; error: unknown };

  const hasSubmitted = (submissions ?? []).length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/exercises" className="transition-colors hover:text-foreground">
          תרגולי שיעורים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">{exercise.title}</span>
      </nav>

      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{exercise.title}</h1>
        {lesson && (
          <p className="mt-1 text-sm text-muted-foreground">
            שיעור: {lesson.title}
          </p>
        )}
      </div>

      {/* Instruction */}
      {exercise.description && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm text-foreground leading-relaxed">{exercise.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Chart placeholder */}
      <Card>
        <CardContent className="flex min-h-64 items-center justify-center pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">גרף אינטראקטיבי</p>
            <p className="text-xs text-muted-foreground/60">ייבנה בשלב הבא</p>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <SubmitExerciseButton exerciseId={id} hasSubmitted={hasSubmitted} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/exercises/\[id\]/page.tsx
git commit -m "feat(student): exercise detail page with chart placeholder | עמוד פרטי תרגול"
```

---

## Task 8: Add exercises to student nav

**Files:**
- Modify: `app/(student)/layout.tsx`

- [ ] **Step 1: Add the nav link** — in `layout.tsx`, after the "שיעורים" link and before "סיכומים":

Current code (lines 52–60):
```tsx
{!denied.has("lessons") && (
  <Link href="/lessons" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
    שיעורים
  </Link>
)}
{!denied.has("summaries") && (
  <Link href="/summaries" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
    סיכומים
  </Link>
)}
```

Replace with:
```tsx
{!denied.has("lessons") && (
  <Link href="/lessons" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
    שיעורים
  </Link>
)}
{!denied.has("exercises") && (
  <Link href="/exercises" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
    תרגולי שיעורים
  </Link>
)}
{!denied.has("summaries") && (
  <Link href="/summaries" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
    סיכומים
  </Link>
)}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/layout.tsx
git commit -m "feat(student): add תרגולי שיעורים to nav | הוספת תרגולים לניווט"
```

---

## Task 9: Admin exercises overview page

**Files:**
- Create: `app/admin/exercises/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import Link from "next/link";
import { DumbbellIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database";
import type { ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

export default async function AdminExercisesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [{ data: students }, { data: exercises }, { data: allSubmissions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("full_name") as unknown as Promise<{ data: Profile[] | null; error: unknown }>,
    db.from("exercises").select("id") as unknown as Promise<{ data: Pick<ExerciseRow, "id">[] | null; error: unknown }>,
    db.from("exercise_submissions").select("user_id, exercise_id") as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "user_id" | "exercise_id">[] | null; error: unknown }>,
  ]);

  const totalExercises = (exercises ?? []).length;

  const submittedByUser = new Map<string, Set<string>>();
  for (const s of allSubmissions ?? []) {
    if (!submittedByUser.has(s.user_id)) submittedByUser.set(s.user_id, new Set());
    submittedByUser.get(s.user_id)!.add(s.exercise_id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DumbbellIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">התקדמות בתרגולים</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            כל התלמידים — {totalExercises} תרגולים סה"כ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(students ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">אין תלמידים רשומים.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {(students ?? []).map((student) => {
                const done = submittedByUser.get(student.id)?.size ?? 0;
                const pct = totalExercises > 0 ? Math.round((done / totalExercises) * 100) : 0;
                return (
                  <li key={student.id}>
                    <Link
                      href={`/admin/exercises/${student.id}`}
                      className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{student.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{student.email}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold text-primary">{done}/{totalExercises}</p>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/exercises/page.tsx
git commit -m "feat(admin): exercises progress overview page | דף התקדמות תרגולים לאדמין"
```

---

## Task 10: Admin per-student drill-down

**Files:**
- Create: `app/admin/exercises/[userId]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database";
import type { LessonRow, ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

interface AdminStudentExercisesPageProps {
  params: Promise<{ userId: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AdminStudentExercisesPage({ params }: AdminStudentExercisesPageProps) {
  await requireAdmin();
  const { userId } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("role", "student")
    .single()) as { data: Profile | null; error: unknown };

  if (!profile) notFound();

  const [{ data: lessons }, { data: exercises }, { data: submissions }] = await Promise.all([
    db.from("lessons").select("id, title").order("order_index") as unknown as Promise<{ data: Pick<LessonRow, "id" | "title">[] | null; error: unknown }>,
    db.from("exercises").select("*").order("order_index") as unknown as Promise<{ data: ExerciseRow[] | null; error: unknown }>,
    db.from("exercise_submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: true }) as unknown as Promise<{ data: ExerciseSubmissionRow[] | null; error: unknown }>,
  ]);

  const exercisesByLesson = new Map<string, ExerciseRow[]>();
  for (const ex of exercises ?? []) {
    if (!exercisesByLesson.has(ex.lesson_id)) exercisesByLesson.set(ex.lesson_id, []);
    exercisesByLesson.get(ex.lesson_id)!.push(ex);
  }

  const submissionsByExercise = new Map<string, ExerciseSubmissionRow[]>();
  for (const s of submissions ?? []) {
    if (!submissionsByExercise.has(s.exercise_id)) submissionsByExercise.set(s.exercise_id, []);
    submissionsByExercise.get(s.exercise_id)!.push(s);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/exercises" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          → חזרה להתקדמות תרגולים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {profile.full_name ?? "תלמיד"} — תרגולים
        </h1>
        <p className="text-sm text-muted-foreground" dir="ltr">{profile.email}</p>
      </div>

      {(lessons ?? []).map((lesson) => {
        const lessonExercises = exercisesByLesson.get(lesson.id) ?? [];
        if (lessonExercises.length === 0) return null;

        return (
          <Card key={lesson.id}>
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">{lesson.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {lessonExercises.map((ex) => {
                const attempts = submissionsByExercise.get(ex.id) ?? [];
                return (
                  <div key={ex.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{ex.title}</p>
                      {attempts.length > 0 ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {attempts.length} {attempts.length === 1 ? "ניסיון" : "ניסיונות"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          טרם הוגש
                        </span>
                      )}
                    </div>

                    {attempts.length > 0 && (
                      <ul className="space-y-1 border-s-2 border-border/50 ps-3">
                        {attempts.map((attempt) => (
                          <li key={attempt.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground">
                              ניסיון {attempt.attempt_number}
                            </span>
                            <span className="text-muted-foreground/70">
                              {formatDate(attempt.submitted_at)}
                            </span>
                            {attempt.answer_data != null && (
                              <span className="font-mono text-muted-foreground/50 truncate max-w-40">
                                {JSON.stringify(attempt.answer_data)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/exercises/\[userId\]/page.tsx
git commit -m "feat(admin): per-student exercise drill-down with all attempts | פירוט תרגולים לתלמיד"
```

---

## Task 11: Add exercises to admin nav

**Files:**
- Modify: `app/admin/_components/admin-nav.tsx`

- [ ] **Step 1: Add import and nav entry**

At the top, add `DumbbellIcon` to the lucide import:
```tsx
import { MenuIcon, XIcon, LayoutDashboardIcon, UsersIcon, FolderIcon, FileTextIcon, DumbbellIcon } from "lucide-react";
```

In the `navLinks` array, add after the summaries entry:
```tsx
{ href: "/admin/exercises", label: "תרגולים", icon: DumbbellIcon, exact: false },
```

Full `navLinks` after change:
```tsx
const navLinks = [
  { href: "/admin", label: "דשבורד", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/students", label: "תלמידים", icon: UsersIcon, exact: false },
  { href: "/admin/modules", label: "ניהול קורסים", icon: FolderIcon, exact: false },
  { href: "/admin/summaries", label: "סיכומים", icon: FileTextIcon, exact: false },
  { href: "/admin/exercises", label: "תרגולים", icon: DumbbellIcon, exact: false },
];
```

- [ ] **Step 2: Verify build**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Full production build check**

```bash
pnpm build
```

Expected: all routes build successfully, no TypeScript or lint errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/_components/admin-nav.tsx
git commit -m "feat(admin): add exercises link to admin nav | הוספת תרגולים לניווט אדמין"
```
