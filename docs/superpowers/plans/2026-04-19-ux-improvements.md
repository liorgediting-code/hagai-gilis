# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the student-facing UX — simpler home screen, better lessons list with real lesson names seeded, and a cleaner lesson detail page.

**Architecture:** Four independent changes in order: (1) seed migration adds real content, (2) home page rebuilt with progress-first layout, (3) lessons list flattened to linear numbered rows, (4) lesson detail breadcrumb simplified. No new dependencies required.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres, Tailwind CSS, shadcn/ui, TypeScript strict.

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/0003_seed_lessons.sql` | **Create** — idempotent seed: 1 module + 7 lessons |
| `app/(student)/page.tsx` | **Modify** — full redesign: progress card + quick-nav grid |
| `app/(student)/lessons/page.tsx` | **Modify** — flat numbered list, drop card-per-module |
| `app/(student)/lessons/[id]/page.tsx` | **Modify** — simplify breadcrumb (remove module middle step) |

---

## Task 1: Seed migration — module + 7 lessons

**Files:**
- Create: `supabase/migrations/0003_seed_lessons.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 0003_seed_lessons.sql
-- Idempotent seed: 1 module + 7 lessons with fixed UUIDs so re-runs are safe.

insert into public.modules (id, title, description, order_index)
values (
  '11111111-1111-1111-1111-111111111111',
  'קורס המסחר — 5 האחוזים הבטוחים',
  'שבעה שיעורים שיעניקו לך שיטה ברורה לאיתור עסקאות ממוקדות בשוק ההון.',
  1
)
on conflict (id) do nothing;

insert into public.lessons (id, module_id, title, description, video_url, order_index)
values
  (
    'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'איתור מניות כמו הר געש לפני פיצוץ',
    'כיצד לזהות מניות בעלות פוטנציאל תנועה חדה — עוד לפני שהיא קורה.',
    null,
    1
  ),
  (
    'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'תמיכה והתנגדות משמעותיים',
    'איך לאתר אזורי מחיר שהשוק מגיב אליהם שוב ושוב.',
    null,
    2
  ),
  (
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'ווליום קיצוני',
    'זיהוי ווליום חריג שמסמן כניסת שחקנים גדולים לפני תנועה.',
    null,
    3
  ),
  (
    'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'פריצות שווא',
    'כיצד להבחין בין פריצה אמיתית לפריצת שווא שגורמת להפסדים.',
    null,
    4
  ),
  (
    'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'מגמה כללית',
    'קריאת מגמת השוק הרחב ויישומה על בחירת כיוון העסקה.',
    null,
    5
  ),
  (
    'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'שינוי מומנטום',
    'זיהוי נקודות בהן המומנטום מתהפך — אות כניסה או יציאה.',
    null,
    6
  ),
  (
    'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'נקודת כניסה לעסקה',
    'השיעור הקריטי ביותר: הצבת פקודת הכניסה המדויקת עם כל הפרמטרים הנכונים.',
    null,
    7
  )
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration via Supabase CLI**

```bash
pnpm supabase db push
```

Expected: migration applied without errors. If you get "project not linked", run `pnpm supabase link --project-ref gbqhvbyisfbcxgpvgdzc` first.

- [ ] **Step 3: Verify rows exist**

```bash
pnpm supabase db remote commit 2>/dev/null; echo "ok"
```

Or open the Supabase dashboard → Table Editor → `modules` and `lessons` and confirm 1 module + 7 lessons exist.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_seed_lessons.sql
git commit -m "feat(db): seed module + 7 lessons as placeholders | זריעת מודול ו-7 שיעורים"
```

---

## Task 2: Redesign student home page

**Files:**
- Modify: `app/(student)/page.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```tsx
import Link from "next/link";
import { BookOpenIcon, FileTextIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { buttonVariants } from "@/components/ui/button";
import type { Tables } from "@/lib/types/database";
import type { LessonRow, LessonProgressRow, UserPermissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

export default async function StudentHomePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: profile },
    { data: lessons },
    { data: progress },
    { data: deniedRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single() as Promise<{
      data: Profile | null;
      error: unknown;
    }>,
    db.from("lessons").select("*").order("order_index") as Promise<{
      data: LessonRow[] | null;
      error: unknown;
    }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as Promise<{
      data: LessonProgressRow[] | null;
      error: unknown;
    }>,
    db.from("user_permissions").select("page").eq("user_id", user.id) as Promise<{
      data: UserPermissionRow[] | null;
      error: unknown;
    }>,
  ]);

  const denied = new Set((deniedRows ?? []).map((r) => r.page));
  const allLessons = lessons ?? [];
  const completedIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );

  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const totalCount = allLessons.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = allLessons.find((l) => !completedIds.has(l.id));

  const canSeeContent = !denied.has("lessons") || !denied.has("summaries");

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        שלום, {profile?.full_name ?? "תלמיד"} 👋
      </h1>

      {/* Continue card */}
      {nextLesson && !denied.has("lessons") && (
        <div className="rounded-xl bg-primary p-5 text-primary-foreground">
          <p className="mb-1 text-sm opacity-80">ממשיך מאיפה שעצרת</p>
          <p className="mb-4 font-heading text-lg font-bold leading-snug">{nextLesson.title}</p>
          <Link
            href={`/lessons/${nextLesson.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/25"
          >
            <PlayCircleIcon className="size-4" aria-hidden="true" />
            המשך שיעור
          </Link>
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && !denied.has("lessons") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">התקדמות בקורס</span>
            <span className="font-medium text-foreground">
              {completedCount} מתוך {totalCount} שיעורים
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick nav grid */}
      {canSeeContent && (
        <div className="grid grid-cols-2 gap-3">
          {!denied.has("lessons") && (
            <Link
              href="/lessons"
              className="flex min-h-20 flex-col items-start justify-between rounded-xl bg-card p-4 transition-colors hover:bg-muted/60"
            >
              <BookOpenIcon className="size-5 text-primary" aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold text-foreground">כל השיעורים</span>
            </Link>
          )}
          {!denied.has("summaries") && (
            <Link
              href="/summaries"
              className="flex min-h-20 flex-col items-start justify-between rounded-xl bg-card p-4 transition-colors hover:bg-muted/60"
            >
              <FileTextIcon className="size-5 text-primary" aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold text-foreground">סיכומים</span>
            </Link>
          )}
        </div>
      )}

      {totalCount === 0 && (
        <p className="text-sm text-muted-foreground">תכנים יתווספו בקרוב. חזור מאוחר יותר.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/page.tsx
git commit -m "feat(student): redesign home page with progress card | עיצוב מחדש של מסך הבית"
```

---

## Task 3: Redesign lessons list — flat numbered list

**Files:**
- Modify: `app/(student)/lessons/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import Link from "next/link";
import { BookOpenIcon, CheckCircleIcon, CircleIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow } from "@/lib/types/course-types";

export default async function LessonsPage() {
  await requirePageAccess("lessons");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [{ data: lessons }, { data: progress }] = await Promise.all([
    db.from("lessons").select("*").order("order_index") as Promise<{
      data: LessonRow[] | null;
      error: unknown;
    }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as Promise<{
      data: LessonProgressRow[] | null;
      error: unknown;
    }>,
  ]);

  const allLessons = lessons ?? [];
  const completedIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );

  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const nextLesson = allLessons.find((l) => !completedIds.has(l.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpenIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">שיעורים</h1>
      </div>

      {allLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין שיעורים. חזור בקרוב.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {completedCount} מתוך {allLessons.length} שיעורים הושלמו
          </p>

          <Card>
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                כל השיעורים
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border/30">
                {allLessons.map((lesson, idx) => {
                  const done = completedIds.has(lesson.id);
                  const isCurrent = nextLesson?.id === lesson.id;

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className={`flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                          isCurrent ? "border-s-2 border-primary bg-primary/5" : ""
                        }`}
                      >
                        {/* Status icon */}
                        <span
                          className="flex size-6 shrink-0 items-center justify-center"
                          aria-label={done ? "הושלם" : isCurrent ? "בתהליך" : "לא הושלם"}
                        >
                          {done ? (
                            <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
                          ) : isCurrent ? (
                            <PlayCircleIcon className="size-5 text-primary" aria-hidden="true" />
                          ) : (
                            <CircleIcon className="size-5 text-muted-foreground/30" aria-hidden="true" />
                          )}
                        </span>

                        {/* Order badge + title */}
                        <div className="flex flex-1 items-center gap-2 overflow-hidden">
                          <span className="shrink-0 text-xs font-bold text-muted-foreground/60">
                            {idx + 1}
                          </span>
                          <p
                            className={`truncate text-sm font-medium ${
                              done ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {lesson.title}
                          </p>
                        </div>

                        {/* Done label */}
                        {done && (
                          <span className="shrink-0 text-xs font-medium text-primary">הושלם</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(student\)/lessons/page.tsx
git commit -m "feat(student): flat numbered lessons list with progress | רשימת שיעורים ממוספרת"
```

---

## Task 4: Simplify lesson detail breadcrumb

**Files:**
- Modify: `app/(student)/lessons/[id]/page.tsx` (lines 57–70 only)

The current breadcrumb renders three segments: "שיעורים → שם מודול → שם שיעור".
Simplify to two segments: "שיעורים → שם שיעור".

- [ ] **Step 1: Replace the breadcrumb block**

In `app/(student)/lessons/[id]/page.tsx`, find and replace:

Old (lines 57–70):
```tsx
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/lessons" className="hover:text-foreground transition-colors">
          שיעורים
        </Link>
        {mod && (
          <>
            <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
            <span className="text-muted-foreground">{mod.title}</span>
          </>
        )}
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="text-foreground font-medium">{lesson.title}</span>
      </nav>
```

New:
```tsx
      {/* Breadcrumb */}
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/lessons" className="transition-colors hover:text-foreground">
          שיעורים
        </Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">{lesson.title}</span>
      </nav>
```

- [ ] **Step 2: Remove now-unused `mod` query and imports**

Since `mod` is no longer rendered, remove:
1. The `mod` fetch block (lines 36–40):
```tsx
  const { data: mod } = (await db
    .from("modules")
    .select("*")
    .eq("id", lesson.module_id)
    .single()) as { data: ModuleRow | null; error: unknown };
```
2. `ModuleRow` from the import on line 13 (remove `, ModuleRow` from the destructured import).

- [ ] **Step 3: Verify the build passes**

```bash
pnpm build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: no TypeScript errors and no "unused variable" warnings.

- [ ] **Step 4: Commit**

```bash
git add app/\(student\)/lessons/\[id\]/page.tsx
git commit -m "refactor(student): simplify lesson breadcrumb to two segments | פישוט נתיב הניווט"
```
