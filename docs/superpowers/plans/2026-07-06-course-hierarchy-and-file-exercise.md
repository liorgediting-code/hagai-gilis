# 3-Level Course Hierarchy + File-Upload Exercise — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-level course hierarchy (נושא → יחידה → שיעור), a file-upload exercise type with admin review, and admin-authored instructions above the exercise.

**Architecture:** Insert a new `units` table between `modules` (=Topic/נושא, kept as-is) and `lessons` (repointed to `unit_id`). Add a `file_upload` exercise type stored in `exercises.content_json`, with student files in a private Supabase Storage bucket and submissions reusing `exercise_submissions`. Admin reviews submissions per-exercise and per-student. Course content is wiped and rebuilt (no backfill).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase (Postgres + Storage + RLS), Tailwind + shadcn/ui, zod, `useActionState`.

## Global Constraints

- Package manager: **pnpm** only. Never npm/yarn.
- Server Components by default; `"use client"` only for hooks/events. `cookies()`/`params` are async — always `await`.
- Mutations = Server Actions in `actions.ts` with `"use server"`. Return `ActionState = { status: "idle" | "success" | "error"; error?: string }` (this repo's shape; `import type { ActionState } from "@/app/(auth)/actions"`). Never throw to client. `revalidatePath` after every mutation.
- Supabase access via `asUntyped(await createClient())` from `@/lib/supabase/server`; cast query results explicitly as `{ data: T | null; error: unknown }` (the `@supabase/ssr` generics quirk).
- Admin gate: `await requireAdmin()` from `@/lib/auth/require-admin` at the top of every admin page/action. Student pages: `requireUser()` + `requirePageAccess("lessons")`.
- RLS on every new table. Admin write check: `EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')`. Never trust client role.
- No `any` (use `unknown` + narrow). No `localStorage`/`sessionStorage`. No inline `style={}` — Tailwind only. Components < 200 lines.
- Hebrew RTL: all user strings Hebrew; logical CSS utilities only (`ms/me/ps/pe/start/end/text-start/text-end`); `dir="ltr"` only on email/password/url/tel/number inputs; directional icons flip with `rtl:rotate-180`. Dates `DD/MM/YYYY` Western digits. Tap targets ≥ 44px (`min-h-11`).
- Types truth is generated `lib/types/database.ts` — regenerate with `pnpm run db:types` after migrations; never hand-edit it.
- No test framework in this repo. "Verify" = `pnpm lint` + `pnpm build` pass, plus the stated manual check. Commit after each task with a Hebrew+English message. Push to origin only when the user asks.

**Terminology mapping (document, do not rename table):** DB table `modules` == UI concept **נושא (Topic)**. New table `units` == **יחידה (Unit)**. Table `lessons` == **שיעור (Lesson)**.

---

## File Structure

**Migrations (create):**
- `supabase/migrations/20260706000000_units_and_file_exercise.sql` — units table + RLS, reparent lessons, wipe content, exercise_submissions admin-update policy, storage bucket + policies, extend content type note.

**Types (modify):**
- `lib/types/course-types.ts` — add `UnitRow`; change `LessonRow.module_id` → `unit_id`.
- `lib/types/exercise-types.ts` — add `FileUploadExercise`, `fileUploadSchema`, `fileUploadAnswerSchema`, extend `exerciseContentSchema`.

**Admin — units (create):**
- `app/admin/units/actions.ts` — create/update/delete unit.
- `app/admin/units/_components/unit-form.tsx` — unit form.
- `app/admin/units/_components/delete-unit-button.tsx` — delete confirm button.
- `app/admin/units/new/page.tsx`, `app/admin/units/[id]/edit/page.tsx` — unit create/edit pages.
- `app/admin/units/[id]/lessons/page.tsx` — lessons under a unit.
- `app/admin/modules/[id]/units/page.tsx` — units under a topic.

**Admin — lessons (modify):**
- `app/admin/lessons/actions.ts` — `module_id` → `unit_id`.
- `app/admin/lessons/_components/lesson-form.tsx` — `moduleId` prop → `unitId`.
- `app/admin/lessons/new/page.tsx`, `app/admin/lessons/[id]/edit/page.tsx` — read `unit_id` param.
- `app/admin/lessons/_components/delete-lesson-button.tsx` — `moduleId` → `unitId`.
- `app/admin/modules/[id]/lessons/page.tsx` — DELETE (replaced by units route).

**Admin — file exercise (create/modify):**
- `app/admin/exercises/file/actions.ts` — `createFileExerciseAction`, `updateFileExerciseAction`.
- `app/admin/exercises/file/_components/file-exercise-form.tsx` — form.
- `app/admin/exercises/file/new/page.tsx`, `app/admin/exercises/file/[id]/edit/page.tsx`.
- `app/admin/exercises/[id]/submissions/page.tsx` — per-exercise student submissions.
- `app/admin/exercises/[id]/submissions/actions.ts` — `reviewFileSubmissionAction`.
- `app/admin/exercises/_components/review-controls.tsx` — pass/fail buttons (shared).
- `app/admin/exercises/page.tsx` — add file-exercise button + type label + submissions link.
- `app/admin/students/[id]/page.tsx` — add per-student file submissions section.

**Student (create/modify):**
- `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx` — uploader.
- `app/(student)/lessons/[id]/exercise/file-actions.ts` — `submitFileUploadAction`.
- `app/(student)/lessons/[id]/page.tsx` — render file-upload section; reparent sibling logic.
- `app/(student)/lessons/[id]/exercise/page.tsx` — exclude file_upload; reparent next-lesson logic.
- `app/(student)/lessons/page.tsx` — render Topic → Unit → Lesson; reparent unlock.

**Shared helper (create):**
- `lib/course/ordering.ts` — `flattenModuleLessons(units, lessons)` used by browse/unlock/nav.

---

## Task 1: Migration — units, reparent lessons, wipe, storage, review policy

**Files:**
- Create: `supabase/migrations/20260706000000_units_and_file_exercise.sql`

**Interfaces:**
- Produces: table `public.units (id, module_id, title, description, order_index, created_at, updated_at)`; `public.lessons.unit_id` (replaces `module_id`); storage bucket `exercise-uploads`; `exercise_submissions` admin UPDATE policy.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260706000000_units_and_file_exercise.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration to hosted Supabase**

Migrations in this repo run against hosted Supabase (project `gbqhvbyisfbcxgpvgdzc`). Apply via the Supabase SQL editor or `pnpm supabase db push` if the CLI is linked. Confirm no error.

Expected: `units` table exists; `lessons` has `unit_id` and no `module_id`; bucket `exercise-uploads` present; new policies listed.

- [ ] **Step 3: Regenerate types**

Run: `pnpm run db:types`
Expected: `lib/types/database.ts` updated — contains a `units` table and `lessons.unit_id`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706000000_units_and_file_exercise.sql lib/types/database.ts
git commit -m "feat(db): units layer, reparent lessons, file-upload storage + review policy | שכבת יחידות ואחסון קבצים"
```

---

## Task 2: Types — UnitRow + reparent LessonRow + file_upload schema

**Files:**
- Modify: `lib/types/course-types.ts`
- Modify: `lib/types/exercise-types.ts`

**Interfaces:**
- Produces: `UnitRow`; `LessonRow` with `unit_id: string` (no `module_id`); `FileUploadExercise`, `fileUploadSchema`, `fileUploadAnswerSchema`, `FileUploadAnswer`; `exerciseContentSchema` union incl. file_upload.

- [ ] **Step 1: Add `UnitRow` and reparent `LessonRow`**

In `lib/types/course-types.ts`, add after `ModuleRow` (line 8):

```ts
export type UnitRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};
```

Then in `LessonRow` change `module_id: string;` to:

```ts
  unit_id: string;
```

- [ ] **Step 2: Add the file_upload exercise type + schemas**

In `lib/types/exercise-types.ts`, add after `MultipleChoiceExercise` (line 42):

```ts
export type FileUploadExercise = {
  type: "file_upload";
  instructions: string;
  required_files: number;
  completion_mode: "manual_review" | "auto_complete";
};

export type UploadedFile = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

export type FileUploadAnswer = {
  files: UploadedFile[];
};
```

Extend the `ExerciseContent` union (line 51) to include `| FileUploadExercise`. File-upload has no answer key to strip, so add it to `SanitizedExerciseContent` too (line 56) as `| FileUploadExercise`.

Add the zod schemas after `multipleChoiceSchema` (line 138):

```ts
export const fileUploadSchema = z.object({
  type: z.literal("file_upload"),
  instructions: z.string().min(1, "הוראות נדרשות").max(4000, "הוראות ארוכות מדי"),
  required_files: z.coerce.number().int().min(1, "נדרש לפחות קובץ אחד").max(10, "עד 10 קבצים"),
  completion_mode: z.enum(["manual_review", "auto_complete"]),
});

export const uploadedFileSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().min(0),
});

export const fileUploadAnswerSchema = z.object({
  files: z.array(uploadedFileSchema).min(1, "נדרש להעלות לפחות קובץ אחד"),
});
```

Extend `exerciseContentSchema` (line 140) to include `fileUploadSchema`:

```ts
export const exerciseContentSchema = z.discriminatedUnion("type", [
  chartClickSchema,
  multipleChoiceSchema,
  fileUploadSchema,
]);
```

- [ ] **Step 3: Verify build**

Run: `pnpm lint && pnpm build`
Expected: PASS. TypeScript errors will surface everywhere `lesson.module_id` is used — those are fixed in Tasks 3, 5, 7. If build blocks progress, proceed to Task 3 (they are the same change set) and build at the end of Task 3.

- [ ] **Step 4: Commit**

```bash
git add lib/types/course-types.ts lib/types/exercise-types.ts
git commit -m "feat(types): UnitRow, lesson unit_id, file_upload exercise schema | טיפוסים ליחידות ותרגיל קבצים"
```

---

## Task 3: Admin — units CRUD + reparent lessons to units

**Files:**
- Create: `app/admin/units/actions.ts`, `app/admin/units/_components/unit-form.tsx`, `app/admin/units/_components/delete-unit-button.tsx`, `app/admin/units/new/page.tsx`, `app/admin/units/[id]/edit/page.tsx`, `app/admin/units/[id]/lessons/page.tsx`, `app/admin/modules/[id]/units/page.tsx`
- Modify: `app/admin/lessons/actions.ts`, `app/admin/lessons/_components/lesson-form.tsx`, `app/admin/lessons/_components/delete-lesson-button.tsx`, `app/admin/lessons/new/page.tsx`, `app/admin/lessons/[id]/edit/page.tsx`, `app/admin/modules/page.tsx`
- Delete: `app/admin/modules/[id]/lessons/page.tsx`

**Interfaces:**
- Consumes: `UnitRow`, `LessonRow`, `ModuleRow`; `ActionState`; `requireAdmin`, `asUntyped`, `createClient`.
- Produces: `createUnitAction`, `updateUnitAction`, `deleteUnitAction`; `UnitForm`; routes `/admin/modules/[id]/units`, `/admin/units/[id]/lessons`.

- [ ] **Step 1: Create unit Server Actions**

Create `app/admin/units/actions.ts` (modeled on `app/admin/modules/actions.ts`):

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import type { UnitRow } from "@/lib/types/course-types";

const unitSchema = z.object({
  module_id: z.string().uuid("מזהה נושא לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(1000, "תיאור ארוך מדי").optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
});

export async function createUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = unitSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("units").insert({
    module_id: parsed.data.module_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
  })) as { data: UnitRow | null; error: unknown };
  if (error) return { status: "error", error: "שגיאה ביצירת היחידה — נסה שנית" };

  revalidatePath(`/admin/modules/${parsed.data.module_id}/units`);
  return { status: "success" };
}

export async function updateUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה יחידה חסר" };

  const parsed = unitSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("units").update({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
  }).eq("id", id)) as { data: UnitRow | null; error: unknown };
  if (error) return { status: "error", error: "שגיאה בעדכון היחידה — נסה שנית" };

  revalidatePath(`/admin/modules/${parsed.data.module_id}/units`);
  return { status: "success" };
}

export async function deleteUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  const moduleId = formData.get("module_id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה יחידה חסר" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("units").delete().eq("id", id)) as { data: null; error: unknown };
  if (error) return { status: "error", error: "שגיאה במחיקת היחידה — נסה שנית" };

  if (typeof moduleId === "string" && moduleId) revalidatePath(`/admin/modules/${moduleId}/units`);
  revalidatePath("/admin/modules");
  return { status: "success" };
}
```

- [ ] **Step 2: Create `UnitForm`**

Create `app/admin/units/_components/unit-form.tsx` (modeled on `module-form.tsx`, adds a `module_id` hidden field and links back to the units list):

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/(auth)/actions";
import type { UnitRow } from "@/lib/types/course-types";

interface UnitFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  moduleId: string;
  defaultValues?: Partial<UnitRow>;
  unitId?: string;
}

const initialState: ActionState = { status: "idle" };

export function UnitForm({ action, moduleId, defaultValues, unitId }: UnitFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {unitId && <input type="hidden" name="id" value={unitId} />}
      <input type="hidden" name="module_id" value={moduleId} />

      <div className="space-y-2">
        <Label htmlFor="title">כותרת היחידה</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} placeholder="לדוגמה: יחידה 1" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור (אופציונלי)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="תיאור קצר של היחידה..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">סדר תצוגה</Label>
        <Input id="order_index" name="order_index" type="number" dir="ltr" min="0" required
          defaultValue={defaultValues?.order_index ?? 0} className="max-w-32" />
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      {state.status === "success" && <p className="text-sm text-primary">נשמר בהצלחה!</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : unitId ? "שמור שינויים" : "צור יחידה"}
        </Button>
        <Link href={`/admin/modules/${moduleId}/units`} className="text-sm text-muted-foreground hover:text-foreground">
          ביטול
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `DeleteUnitButton`**

Create `app/admin/units/_components/delete-unit-button.tsx`. First read `app/admin/modules/_components/delete-module-button.tsx` and mirror it exactly, but: import `deleteUnitAction` from `../actions`, accept props `{ unitId: string; unitTitle: string; moduleId: string }`, render a hidden `id={unitId}` and hidden `module_id={moduleId}`, and use the Hebrew confirm text `` `למחוק את היחידה "${unitTitle}"? כל השיעורים בתוכה יימחקו.` ``.

- [ ] **Step 4: Create the units-under-topic page**

Create `app/admin/modules/[id]/units/page.tsx` (modeled on the old `modules/[id]/lessons/page.tsx`, but lists units and links to each unit's lessons):

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon, BookOpenIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteUnitButton } from "@/app/admin/units/_components/delete-unit-button";
import type { ModuleRow, UnitRow } from "@/lib/types/course-types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ModuleUnitsPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const db = asUntyped(await createClient());

  const [{ data: mod }, { data: units }] = (await Promise.all([
    db.from("modules").select("*").eq("id", id).single(),
    db.from("units").select("*").eq("module_id", id).order("order_index"),
  ])) as [{ data: ModuleRow | null }, { data: UnitRow[] | null }];

  if (!mod) notFound();
  const list = units ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← ניהול נושאים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">{mod.title}</h1>
        <p className="text-sm text-muted-foreground">יחידות בנושא זה</p>
      </div>

      <div className="flex justify-end">
        <Link href={`/admin/units/new?module_id=${mod.id}`} className={buttonVariants({ className: "min-h-11" })}>
          הוסף יחידה
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">יחידות ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">עדיין אין יחידות. הוסף את היחידה הראשונה.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {list.map((unit) => (
                <li key={unit.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{unit.order_index}</span>
                      <p className="text-sm font-semibold text-foreground">{unit.title}</p>
                    </div>
                    {unit.description && <p className="text-xs text-muted-foreground line-clamp-1">{unit.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/units/${unit.id}/lessons`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}>
                      <BookOpenIcon className="size-3.5" aria-hidden="true" />
                      נהל שיעורים
                    </Link>
                    <Link href={`/admin/units/${unit.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}>
                      <PencilIcon className="size-3.5" aria-hidden="true" />
                      ערוך
                    </Link>
                    <DeleteUnitButton unitId={unit.id} unitTitle={unit.title} moduleId={mod.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Create unit new/edit pages**

Read `app/admin/modules/new/page.tsx` and `app/admin/modules/[id]/edit/page.tsx` for the exact page shell. Create the unit equivalents:

`app/admin/units/new/page.tsx` — reads `searchParams: Promise<{ module_id?: string }>`, `await requireAdmin()`, `notFound()` if no `module_id`, renders `<UnitForm action={createUnitAction} moduleId={moduleId} />` inside the same card/heading shell (heading "יחידה חדשה").

`app/admin/units/[id]/edit/page.tsx` — `await requireAdmin()`, fetch the unit by `id` via `db.from("units").select("*").eq("id", id).single()` cast `{ data: UnitRow | null }`, `notFound()` if missing, render `<UnitForm action={updateUnitAction} moduleId={unit.module_id} unitId={unit.id} defaultValues={unit} />` (heading "עריכת יחידה").

- [ ] **Step 6: Create lessons-under-unit page**

Create `app/admin/units/[id]/lessons/page.tsx` by copying the OLD `app/admin/modules/[id]/lessons/page.tsx` content, then:
- Fetch the unit instead of the module: `db.from("units").select("*").eq("id", id).single()` as `{ data: UnitRow | null }`.
- Fetch lessons by `unit_id`: `db.from("lessons").select("*").eq("unit_id", id).order("order_index")`.
- Back-link points to `/admin/modules/${unit.module_id}/units` with text `← חזרה ליחידות`.
- "הוסף שיעור" link: `/admin/lessons/new?unit_id=${unit.id}`.
- Edit link: `/admin/lessons/${lesson.id}/edit?unit_id=${unit.id}`.
- `<DeleteLessonButton lessonId={lesson.id} lessonTitle={lesson.title} unitId={unit.id} />`.
- Keep the "ערוך סיכום" link to `/admin/summaries/${lesson.id}` unchanged.

- [ ] **Step 7: Reparent lesson actions and form**

In `app/admin/lessons/actions.ts`: rename the `module_id` field to `unit_id` throughout `lessonSchema` (`unit_id: z.string().uuid("מזהה יחידה לא תקין")`), the parse objects, the insert (`unit_id: parsed.data.unit_id`), and all `revalidatePath` calls → `` `/admin/units/${parsed.data.unit_id}/lessons` ``. In `deleteLessonAction`, read `formData.get("unit_id")` and revalidate `` `/admin/units/${unitId}/lessons` ``.

In `app/admin/lessons/_components/lesson-form.tsx`: change prop `moduleId: string` → `unitId: string`, the hidden input to `name="unit_id" value={unitId}`, and the cancel `href` to `` `/admin/units/${unitId}/lessons` ``.

In `app/admin/lessons/_components/delete-lesson-button.tsx`: read it first, then rename `moduleId` prop → `unitId` and its hidden `module_id` field → `unit_id`.

In `app/admin/lessons/new/page.tsx` and `app/admin/lessons/[id]/edit/page.tsx`: read them, then change the `searchParams` key `module_id` → `unit_id` and pass `unitId={unitId}` to `<LessonForm>`.

- [ ] **Step 8: Repoint the topics list + delete old lessons route**

In `app/admin/modules/page.tsx`, change the "נהל שיעורים" link (line 66) to point to units:

```tsx
                    <Link
                      href={`/admin/modules/${mod.id}/units`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5 min-h-9" })}
                    >
                      <BookOpenIcon className="size-3.5" aria-hidden="true" />
                      נהל יחידות
                    </Link>
```

Delete the old route: `git rm app/admin/modules/[id]/lessons/page.tsx`.

- [ ] **Step 9: Verify build**

Run: `pnpm lint && pnpm build`
Expected: PASS (student pages still referencing `module_id` are fixed in Task 7; if build fails only on `app/(student)/**` lesson pages, that is expected and cleared by Task 7 — but admin/units code must compile). If any admin file errors, fix before committing.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(admin): units CRUD + reparent lessons to units | ניהול יחידות ושיוך שיעורים ליחידה"
```

---

## Task 4: Shared lesson-ordering helper

**Files:**
- Create: `lib/course/ordering.ts`

**Interfaces:**
- Consumes: `UnitRow`, `LessonRow`.
- Produces: `flattenModuleLessons(units: Pick<UnitRow,"id"|"order_index">[], lessons: LessonRow[]): LessonRow[]` — lessons of a module in linear order (unit order, then lesson order). Used by student browse/unlock/nav in Task 7.

- [ ] **Step 1: Write the helper**

Create `lib/course/ordering.ts`:

```ts
import type { LessonRow, UnitRow } from "@/lib/types/course-types";

/**
 * Flatten a module's lessons into a single linear sequence:
 * ordered by the unit's order_index, then the lesson's order_index.
 * Progression (unlock / prev-next) runs over this linear list.
 */
export function flattenModuleLessons(
  units: Pick<UnitRow, "id" | "order_index">[],
  lessons: LessonRow[],
): LessonRow[] {
  const unitOrder = new Map(units.map((u) => [u.id, u.order_index]));
  const inModule = lessons.filter((l) => unitOrder.has(l.unit_id));
  return inModule.sort((a, b) => {
    const ua = unitOrder.get(a.unit_id) ?? 0;
    const ub = unitOrder.get(b.unit_id) ?? 0;
    if (ua !== ub) return ua - ub;
    return a.order_index - b.order_index;
  });
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm lint`
Expected: PASS.

```bash
git add lib/course/ordering.ts
git commit -m "feat(course): linear lesson ordering helper across units | סדר שיעורים לינארי בין יחידות"
```

---

## Task 5: Admin — file-upload exercise creation form

**Files:**
- Create: `app/admin/exercises/file/actions.ts`, `app/admin/exercises/file/_components/file-exercise-form.tsx`, `app/admin/exercises/file/new/page.tsx`, `app/admin/exercises/file/[id]/edit/page.tsx`
- Modify: `app/admin/exercises/page.tsx`

**Interfaces:**
- Consumes: `fileUploadSchema`, `FileUploadExercise`; `ActionState`; `LessonRow`, `ExerciseRow`.
- Produces: `createFileExerciseAction`, `updateFileExerciseAction`; `/admin/exercises/file/new`, `/admin/exercises/file/[id]/edit`.

- [ ] **Step 1: Create file-exercise actions**

Create `app/admin/exercises/file/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import { fileUploadSchema } from "@/lib/types/exercise-types";

const metaSchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
});

function buildContent(formData: FormData):
  | { ok: true; data: z.infer<typeof fileUploadSchema> }
  | { ok: false; error: string } {
  const parsed = fileUploadSchema.safeParse({
    type: "file_upload",
    instructions: formData.get("instructions"),
    required_files: formData.get("required_files"),
    completion_mode: formData.get("completion_mode"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "תוכן לא תקין" };
  return { ok: true, data: parsed.data };
}

export async function createFileExerciseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const meta = metaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    order_index: formData.get("order_index"),
  });
  if (!meta.success) return { status: "error", error: meta.error.errors[0]?.message ?? "קלט לא תקין" };

  const content = buildContent(formData);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").insert({
    lesson_id: meta.data.lesson_id,
    title: meta.data.title,
    level: 1,
    description: null,
    order_index: meta.data.order_index,
    content_json: content.data,
  });
  if (error) return { status: "error", error: "שגיאה ביצירת התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  return { status: "success" };
}

export async function updateFileExerciseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה תרגיל חסר" };

  const meta = metaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    order_index: formData.get("order_index"),
  });
  if (!meta.success) return { status: "error", error: meta.error.errors[0]?.message ?? "קלט לא תקין" };

  const content = buildContent(formData);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").update({
    lesson_id: meta.data.lesson_id,
    title: meta.data.title,
    order_index: meta.data.order_index,
    content_json: content.data,
  }).eq("id", id);
  if (error) return { status: "error", error: "שגיאה בעדכון התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  return { status: "success" };
}
```

- [ ] **Step 2: Create the file-exercise form**

Create `app/admin/exercises/file/_components/file-exercise-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/(auth)/actions";
import type { FileUploadExercise } from "@/lib/types/exercise-types";

interface LessonOption { id: string; title: string }

interface Props {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  lessons: LessonOption[];
  exerciseId?: string;
  defaultLessonId?: string;
  defaultTitle?: string;
  defaultOrderIndex?: number;
  defaultContent?: FileUploadExercise;
}

const initialState: ActionState = { status: "idle" };

export function FileExerciseForm({
  action, lessons, exerciseId, defaultLessonId, defaultTitle, defaultOrderIndex, defaultContent,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {exerciseId && <input type="hidden" name="id" value={exerciseId} />}

      <div className="space-y-2">
        <Label htmlFor="lesson_id">שיעור משויך</Label>
        <select
          id="lesson_id"
          name="lesson_id"
          required
          defaultValue={defaultLessonId ?? ""}
          className="flex min-h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="" disabled>בחר שיעור</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">כותרת התרגיל</Label>
        <Input id="title" name="title" required defaultValue={defaultTitle} placeholder="לדוגמה: העלאת ניתוח גרף" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">הוראות (יוצגו מעל התרגיל)</Label>
        <textarea
          id="instructions"
          name="instructions"
          rows={5}
          required
          defaultValue={defaultContent?.instructions ?? ""}
          placeholder="הסבר לתלמיד מה עליו להעלות..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="required_files">מספר קבצים נדרש</Label>
        <Input id="required_files" name="required_files" type="number" dir="ltr" min="1" max="10" required
          defaultValue={defaultContent?.required_files ?? 1} className="max-w-32" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="completion_mode">אופן השלמה</Label>
        <select
          id="completion_mode"
          name="completion_mode"
          required
          defaultValue={defaultContent?.completion_mode ?? "manual_review"}
          className="flex min-h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="manual_review">דורש בדיקה ידנית של המנהל</option>
          <option value="auto_complete">מושלם אוטומטית עם ההעלאה</option>
        </select>
        <p className="text-xs text-muted-foreground">
          בדיקה ידנית: התלמיד מסמן &quot;ממתין לבדיקה&quot; עד שהמנהל מאשר. אוטומטי: התרגיל מושלם מיד עם ההעלאה.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">סדר תצוגה</Label>
        <Input id="order_index" name="order_index" type="number" dir="ltr" min="0" required
          defaultValue={defaultOrderIndex ?? 0} className="max-w-32" />
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      {state.status === "success" && <p className="text-sm text-primary">נשמר בהצלחה!</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : exerciseId ? "שמור שינויים" : "צור תרגיל"}
        </Button>
        <Link href="/admin/exercises" className="text-sm text-muted-foreground hover:text-foreground">ביטול</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create new/edit pages**

Create `app/admin/exercises/file/new/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { FileExerciseForm } from "../_components/file-exercise-form";
import { createFileExerciseAction } from "../actions";
import type { LessonRow } from "@/lib/types/course-types";

interface Props { searchParams: Promise<{ lesson_id?: string }> }

export default async function NewFileExercisePage({ searchParams }: Props) {
  await requireAdmin();
  const { lesson_id } = await searchParams;
  const db = asUntyped(await createClient());
  const { data: lessons } = (await db.from("lessons").select("id, title").order("title")) as {
    data: Pick<LessonRow, "id" | "title">[] | null;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">תרגיל העלאת קובץ חדש</h1>
      <FileExerciseForm action={createFileExerciseAction} lessons={lessons ?? []} defaultLessonId={lesson_id} />
    </div>
  );
}
```

Create `app/admin/exercises/file/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { FileExerciseForm } from "../../_components/file-exercise-form";
import { updateFileExerciseAction } from "../../actions";
import type { ExerciseRow, LessonRow } from "@/lib/types/course-types";
import type { FileUploadExercise } from "@/lib/types/exercise-types";

interface Props { params: Promise<{ id: string }> }

export default async function EditFileExercisePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const db = asUntyped(await createClient());

  const [{ data: exercise }, { data: lessons }] = (await Promise.all([
    db.from("exercises").select("*").eq("id", id).single(),
    db.from("lessons").select("id, title").order("title"),
  ])) as [{ data: ExerciseRow | null }, { data: Pick<LessonRow, "id" | "title">[] | null }];

  if (!exercise) notFound();
  const content = exercise.content_json as FileUploadExercise | null;
  if (!content || content.type !== "file_upload") notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">עריכת תרגיל העלאת קובץ</h1>
      <FileExerciseForm
        action={updateFileExerciseAction}
        lessons={lessons ?? []}
        exerciseId={exercise.id}
        defaultLessonId={exercise.lesson_id}
        defaultTitle={exercise.title}
        defaultOrderIndex={exercise.order_index}
        defaultContent={content}
      />
    </div>
  );
}
```

- [ ] **Step 4: Wire into the exercises list page**

In `app/admin/exercises/page.tsx`:
- Add a second header button next to "תרגיל חדש" linking to `/admin/exercises/file/new` with label "תרגיל העלאת קובץ" (same `buttonVariants` styling, wrap both in a `flex gap-2` container).
- Extend the type label (line 76-78) to add file_upload:

```tsx
                        {ex.content_json?.type === "chart_click" ? "לחיצה על גרף" :
                         ex.content_json?.type === "multiple_choice" ? "שאלה אמריקאית" :
                         ex.content_json?.type === "file_upload" ? "העלאת קובץ" : "ישן"}
```

- Make the edit link type-aware: for file_upload exercises route to the file editor, otherwise the chart wizard editor:

```tsx
                    <Link
                      href={ex.content_json?.type === "file_upload"
                        ? `/admin/exercises/file/${ex.id}/edit`
                        : `/admin/exercises/edit/${ex.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
```

- For file_upload rows, add a "הגשות" link to `/admin/exercises/${ex.id}/submissions` (created in Task 6) — render it conditionally when `ex.content_json?.type === "file_upload"`, styled `buttonVariants({ variant: "outline", size: "sm" })`.

- [ ] **Step 5: Verify build**

Run: `pnpm lint && pnpm build`
Expected: PASS for admin exercise files. (The `/admin/exercises/[id]/submissions` link target does not exist until Task 6 — that is fine, Next does not validate href targets at build time.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): file-upload exercise creation form + list wiring | טופס יצירת תרגיל העלאת קובץ"
```

---

## Task 6: Admin — review submissions (per-exercise + per-student)

**Files:**
- Create: `app/admin/exercises/[id]/submissions/page.tsx`, `app/admin/exercises/[id]/submissions/actions.ts`, `app/admin/exercises/_components/review-controls.tsx`
- Modify: `app/admin/students/[id]/page.tsx`

**Interfaces:**
- Consumes: `ExerciseRow`, `ExerciseSubmissionRow`, `FileUploadAnswer`, `Tables<"profiles">`.
- Produces: `reviewFileSubmissionAction(_prev, formData)` (fields: `submission_id`, `passed` in {`true`,`false`}, `exercise_id`); `ReviewControls` client component; per-exercise submissions page; per-student submissions section.

- [ ] **Step 1: Create the review action**

Create `app/admin/exercises/[id]/submissions/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const schema = z.object({
  submission_id: z.string().uuid("מזהה הגשה לא תקין"),
  exercise_id: z.string().uuid().optional(),
  passed: z.enum(["true", "false"]),
});

export async function reviewFileSubmissionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    submission_id: formData.get("submission_id"),
    exercise_id: formData.get("exercise_id") || undefined,
    passed: formData.get("passed"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("exercise_submissions")
    .update({ passed: parsed.data.passed === "true" })
    .eq("id", parsed.data.submission_id)) as { data: null; error: unknown };
  if (error) return { status: "error", error: "שגיאה בעדכון ההגשה — נסה שנית" };

  if (parsed.data.exercise_id) revalidatePath(`/admin/exercises/${parsed.data.exercise_id}/submissions`);
  return { status: "success" };
}
```

- [ ] **Step 2: Create the review controls client component**

Create `app/admin/exercises/_components/review-controls.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { reviewFileSubmissionAction } from "@/app/admin/exercises/[id]/submissions/actions";

const initialState = { status: "idle" as const };

interface Props {
  submissionId: string;
  exerciseId: string;
  passed: boolean | null;
}

export function ReviewControls({ submissionId, exerciseId, passed }: Props) {
  const [state, formAction, isPending] = useActionState(reviewFileSubmissionAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="exercise_id" value={exerciseId} />
      <Button
        type="submit" name="passed" value="true" size="sm" disabled={isPending}
        variant={passed === true ? "default" : "outline"} className="min-h-9"
      >
        אושר
      </Button>
      <Button
        type="submit" name="passed" value="false" size="sm" disabled={isPending}
        variant={passed === false ? "default" : "outline"}
        className="min-h-9 text-destructive"
      >
        נדחה
      </Button>
      {state.status === "error" && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
```

- [ ] **Step 3: Create the per-exercise submissions page**

Create `app/admin/exercises/[id]/submissions/page.tsx`. It lists every student who submitted, their files (signed download URLs), status, and `ReviewControls`.

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewControls } from "@/app/admin/exercises/_components/review-controls";
import type { Tables } from "@/lib/types/database";
import type { ExerciseRow, ExerciseSubmissionRow } from "@/lib/types/course-types";
import type { FileUploadAnswer, FileUploadExercise } from "@/lib/types/exercise-types";

type Profile = Pick<Tables<"profiles">, "id" | "full_name" | "email">;

interface Props { params: Promise<{ id: string }> }

function statusLabel(passed: boolean | null): { text: string; cls: string } {
  if (passed === true) return { text: "אושר", cls: "text-primary" };
  if (passed === false) return { text: "נדחה", cls: "text-destructive" };
  return { text: "ממתין לבדיקה", cls: "text-amber-500" };
}

export default async function ExerciseSubmissionsPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: exercise } = (await db.from("exercises").select("*").eq("id", id).single()) as {
    data: ExerciseRow | null;
  };
  if (!exercise) notFound();
  const content = exercise.content_json as FileUploadExercise | null;
  if (!content || content.type !== "file_upload") notFound();

  const { data: subs } = (await db
    .from("exercise_submissions")
    .select("*")
    .eq("exercise_id", id)
    .order("submitted_at", { ascending: false })) as { data: ExerciseSubmissionRow[] | null };

  const submissions = subs ?? [];
  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const { data: profiles } = (await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])) as unknown as {
    data: Profile[] | null;
  };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Sign each stored file for download (1h).
  const signed = new Map<string, string>();
  for (const s of submissions) {
    const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
    for (const f of files) {
      const { data } = await supabase.storage.from("exercise-uploads").createSignedUrl(f.path, 3600);
      if (data?.signedUrl) signed.set(f.path, data.signedUrl);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/exercises" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← תרגילים
        </Link>
        <h1 className="font-heading text-2xl font-bold text-foreground">הגשות — {exercise.title}</h1>
        <p className="text-sm text-muted-foreground">{content.instructions}</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">הגשות תלמידים ({submissions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {submissions.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">עדיין אין הגשות.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {submissions.map((s) => {
                const p = profileMap.get(s.user_id);
                const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
                const st = statusLabel(s.passed);
                return (
                  <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{p?.full_name ?? "תלמיד"}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{p?.email}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {files.map((f) => (
                          <a
                            key={f.path}
                            href={signed.get(f.path) ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-muted px-2 py-1 text-xs text-primary hover:underline"
                          >
                            {f.name}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${st.cls}`}>{st.text}</span>
                      <ReviewControls submissionId={s.id} exerciseId={exercise.id} passed={s.passed} />
                    </div>
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

- [ ] **Step 4: Add the per-student file-submissions section**

In `app/admin/students/[id]/page.tsx`, add a query to the `Promise.all` block for this student's file submissions joined to their exercise, and render a new card. Add to the destructured array and the `Promise.all`:

```tsx
    supabase
      .from("exercise_submissions")
      .select("id, exercise_id, answer_data, passed, submitted_at, exercises!inner(id, title, content_json)")
      .eq("user_id", id)
      .order("submitted_at", { ascending: false }) as unknown as Promise<{
      data: Array<{
        id: string;
        exercise_id: string;
        answer_data: unknown;
        passed: boolean | null;
        submitted_at: string;
        exercises: { id: string; title: string; content_json: { type?: string } | null };
      }> | null;
    }>,
```

Name the destructured variable `{ data: fileSubs }`. After the existing cards, filter to file_upload and render (import `ReviewControls` and `FileUploadAnswer`):

```tsx
      {(fileSubs ?? []).filter((s) => s.exercises.content_json?.type === "file_upload").length > 0 && (
        <Card>
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-semibold">הגשות קבצים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/30">
              {(fileSubs ?? [])
                .filter((s) => s.exercises.content_json?.type === "file_upload")
                .map((s) => {
                  const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
                  const label = s.passed === true ? "אושר" : s.passed === false ? "נדחה" : "ממתין לבדיקה";
                  const cls = s.passed === true ? "text-primary" : s.passed === false ? "text-destructive" : "text-amber-500";
                  return (
                    <li key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <Link href={`/admin/exercises/${s.exercise_id}/submissions`} className="text-sm font-medium text-foreground hover:text-primary">
                          {s.exercises.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{files.length} קבצים · {formatDate(s.submitted_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${cls}`}>{label}</span>
                        <ReviewControls submissionId={s.id} exerciseId={s.exercise_id} passed={s.passed} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      )}
```

Add imports at the top of the file: `import { ReviewControls } from "@/app/admin/exercises/_components/review-controls";` and `import type { FileUploadAnswer } from "@/lib/types/exercise-types";`. (`formatDate` already exists in this file at line 25.) Add a `revalidatePath("/admin/students/${id}")` is not needed here — the review action revalidates the per-exercise page; the per-student page re-renders on navigation. For immediate refresh, add `revalidatePath` for the students detail path inside `reviewFileSubmissionAction` is out of scope (it lacks the student id); rely on navigation refresh.

- [ ] **Step 5: Verify build**

Run: `pnpm lint && pnpm build`
Expected: PASS.

Manual check: as admin, open `/admin/exercises/{fileExerciseId}/submissions` (no submissions yet → empty state renders) and a student detail page (no file submissions → section hidden).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): review file submissions per-exercise and per-student | בדיקת הגשות קבצים"
```

---

## Task 7: Student — file-upload exercise UI + submit + browsing through units

**Files:**
- Create: `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx`, `app/(student)/lessons/[id]/exercise/file-actions.ts`
- Modify: `app/(student)/lessons/[id]/page.tsx`, `app/(student)/lessons/[id]/exercise/page.tsx`, `app/(student)/lessons/page.tsx`

**Interfaces:**
- Consumes: `fileUploadAnswerSchema`, `FileUploadExercise`, `FileUploadAnswer`, `flattenModuleLessons`.
- Produces: `submitFileUploadAction(formData)` (server), `FileUploadExercise` component.

- [ ] **Step 1: Create the file-upload submit action**

Create `app/(student)/lessons/[id]/exercise/file-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ExerciseRow } from "@/lib/types/course-types";
import type { FileUploadExercise, UploadedFile } from "@/lib/types/exercise-types";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB per file

export type FileSubmitResult = { status: "idle" | "success" | "error"; error?: string; passed?: boolean };

export async function submitFileUploadAction(formData: FormData): Promise<FileSubmitResult> {
  const supabase = asUntyped(await createClient());
  const { data: { user } } = (await supabase.auth.getUser()) as { data: { user: { id: string } | null } };
  if (!user) return { status: "error", error: "לא מחובר" };

  const exerciseId = formData.get("exercise_id");
  const lessonId = formData.get("lesson_id");
  const uuid = z.string().uuid();
  if (typeof exerciseId !== "string" || !uuid.safeParse(exerciseId).success ||
      typeof lessonId !== "string" || !uuid.safeParse(lessonId).success) {
    return { status: "error", error: "מזהה לא תקין" };
  }

  // Re-fetch exercise server-side — never trust client content.
  const { data: exercise } = (await supabase
    .from("exercises")
    .select("id, lesson_id, content_json")
    .eq("id", exerciseId)
    .single()) as { data: Pick<ExerciseRow, "id" | "lesson_id" | "content_json"> | null };
  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };
  if (exercise.lesson_id !== lessonId) return { status: "error", error: "תרגיל לא שייך לשיעור זה" };

  const content = exercise.content_json as FileUploadExercise | null;
  if (!content || content.type !== "file_upload") return { status: "error", error: "סוג תרגיל שגוי" };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length < content.required_files) {
    return { status: "error", error: `נדרש להעלות לפחות ${content.required_files} קבצים` };
  }
  for (const f of files) {
    if (!ALLOWED.has(f.type)) return { status: "error", error: "סוג קובץ לא נתמך — רק תמונות או PDF" };
    if (f.size > MAX_BYTES) return { status: "error", error: "קובץ גדול מדי (מקסימום 10MB)" };
  }

  const uploaded: UploadedFile[] = [];
  for (const f of files) {
    const safeName = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${exerciseId}/${user.id}/${randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("exercise-uploads").upload(path, f, {
      contentType: f.type,
      upsert: false,
    });
    if (upErr) return { status: "error", error: "שגיאה בהעלאת הקובץ — נסה שנית" };
    uploaded.push({ path, name: f.name, mime: f.type, size: f.size });
  }

  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null };
  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const passed = content.completion_mode === "auto_complete" ? true : null;

  const { error: insErr } = (await supabase.from("exercise_submissions").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    attempt_number: nextAttempt,
    answer_data: { files: uploaded },
    passed,
    score_pct: null,
  })) as { error: unknown };
  if (insErr) return { status: "error", error: "שגיאה בשמירת ההגשה — נסה שנית" };

  revalidatePath(`/lessons/${lessonId}`);
  return { status: "success", passed: passed === true };
}
```

- [ ] **Step 2: Create the file-upload student component**

Create `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { submitFileUploadAction } from "../file-actions";
import type { FileUploadExercise } from "@/lib/types/exercise-types";

interface Props {
  exerciseId: string;
  lessonId: string;
  content: FileUploadExercise;
  existing: { count: number; passed: boolean | null } | null;
}

export function FileUploadExercise({ exerciseId, lessonId, content, existing }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ passed: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitFileUploadAction(formData);
      if (res.status === "error") setError(res.error ?? "שגיאה");
      else setDone({ passed: res.passed ?? false });
    });
  }

  const alreadyLabel =
    existing?.passed === true ? "ההגשה אושרה ✓" :
    existing?.passed === false ? "ההגשה נדחתה — ניתן להעלות שוב" :
    existing ? "ההגשה נשלחה — ממתינה לבדיקת המנהל" : null;

  if (done) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          {done.passed ? "הקובץ הועלה והתרגיל הושלם!" : "הקובץ נשלח וממתין לבדיקת המנהל"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{content.instructions}</p>
      </div>

      {alreadyLabel && <p className="text-sm text-muted-foreground">{alreadyLabel}</p>}

      <form action={onSubmit} className="space-y-4">
        <input type="hidden" name="exercise_id" value={exerciseId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <div className="space-y-2">
          <label htmlFor="files" className="text-sm font-medium">
            העלה {content.required_files} קבצים (תמונות או PDF)
          </label>
          <input
            id="files"
            name="files"
            type="file"
            multiple
            required
            accept="image/*,application/pdf"
            className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
          />
          <p className="text-xs text-muted-foreground">נדרשים לפחות {content.required_files} קבצים · עד 10MB לקובץ</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "מעלה..." : "שלח הגשה"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Render the file-upload section on the lesson page**

In `app/(student)/lessons/[id]/page.tsx`:

First fix the sibling logic to work across units. Replace the `siblings` query (lines 56-60) — fetch the module's units then its lessons. Change the `Promise.all` so it fetches `units` for the lesson's module and lessons for those units. Concretely, after fetching `lesson`, add before the `Promise.all`:

```tsx
  const { data: unitRow } = (await db
    .from("units")
    .select("id, module_id, order_index")
    .eq("id", lesson.unit_id)
    .single()) as { data: { id: string; module_id: string; order_index: number } | null };
```

Then replace the `siblings` entry in `Promise.all` with a two-step: fetch all units of the module and all lessons in them. Simplest: after the existing `Promise.all`, compute siblings separately:

```tsx
  const { data: moduleUnits } = (await db
    .from("units")
    .select("id, order_index")
    .eq("module_id", unitRow?.module_id ?? "")
    .order("order_index")) as { data: { id: string; order_index: number }[] | null };

  const unitIds = (moduleUnits ?? []).map((u) => u.id);
  const { data: moduleLessons } = (await db
    .from("lessons")
    .select("*")
    .in("unit_id", unitIds.length > 0 ? unitIds : ["00000000-0000-0000-0000-000000000000"])) as {
    data: LessonRow[] | null;
  };

  const orderedSiblings = flattenModuleLessons(moduleUnits ?? [], moduleLessons ?? []);
```

Remove the old `siblings` query from `Promise.all` and its destructure. Replace `currentIndex`/`prevLesson` computation (lines 72-73) with:

```tsx
  const currentIndex = orderedSiblings.findIndex((s) => s.id === id);
  const prevLesson = currentIndex > 0 ? orderedSiblings[currentIndex - 1] : null;
```

Add imports: `import { flattenModuleLessons } from "@/lib/course/ordering";`.

Now split exercises into chart-type vs file-upload. Replace the `firstExercise` query (lines 61-67) with a fetch of all this lesson's exercises + this user's submissions on them:

```tsx
    (db
      .from("exercises")
      .select("id, order_index, content_json")
      .eq("lesson_id", id)
      .order("order_index", { ascending: true }) as unknown) as Promise<{
      data: { id: string; order_index: number; content_json: { type?: string } | null }[] | null;
    }>,
```

Name the destructured var `{ data: lessonExercises }`. After the `Promise.all`, derive:

```tsx
  const fileExercises = (lessonExercises ?? []).filter((e) => e.content_json?.type === "file_upload");
  const hasChartExercise = (lessonExercises ?? []).some(
    (e) => e.content_json?.type === "chart_click" || e.content_json?.type === "multiple_choice",
  );

  const fileExerciseIds = fileExercises.map((e) => e.id);
  const { data: fileSubs } = (await db
    .from("exercise_submissions")
    .select("exercise_id, passed")
    .eq("user_id", user.id)
    .in("exercise_id", fileExerciseIds.length > 0 ? fileExerciseIds : ["00000000-0000-0000-0000-000000000000"])) as {
    data: { exercise_id: string; passed: boolean | null }[] | null;
  };
```

Change the chart practice card condition from `firstExercise` to `hasChartExercise`. Then, below that card, render the file-upload exercises (fetch their full content). To avoid a second round-trip, fetch full content in the exercises query above by selecting `content_json` (already selected). Render each file exercise using the client component — but the client component needs the typed `FileUploadExercise` content. Add:

```tsx
  const fileSubMap = new Map((fileSubs ?? []).map((s) => [s.exercise_id, s]));
```

And render (import the component + type):

```tsx
      {/* File-upload submission tasks — available once video marked complete */}
      {fileExercises.length > 0 && isCompleted && fileExercises.map((ex) => {
        const content = ex.content_json as FileUploadExercise;
        const existing = fileSubMap.get(ex.id);
        return (
          <Card key={ex.id}>
            <CardContent className="pt-5 pb-5 space-y-3">
              <p className="font-semibold text-sm">משימת הגשה</p>
              <FileUploadExerciseClient
                exerciseId={ex.id}
                lessonId={id}
                content={content}
                existing={existing ? { count: 1, passed: existing.passed } : null}
              />
            </CardContent>
          </Card>
        );
      })}
      {fileExercises.length > 0 && !isCompleted && (
        <Card className="opacity-60">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground">סמן את הצפייה בשיעור כהושלמה כדי לפתוח את משימת ההגשה</p>
          </CardContent>
        </Card>
      )}
```

Add imports: `import { FileUploadExercise as FileUploadExerciseClient } from "./exercise/_components/file-upload-exercise";` and `import type { FileUploadExercise } from "@/lib/types/exercise-types";`.

- [ ] **Step 4: Exclude file_upload from the chart flow + reparent next-lesson**

In `app/(student)/lessons/[id]/exercise/page.tsx`:

The lesson select currently reads `module_id` (line 111). Change the select to `unit_id`:

```tsx
    .select("id, title, order_index, unit_id, pass_threshold")
```

And update the destructured type (line 114) `"module_id"` → `"unit_id"`.

Filter file_upload out of the exercises used by the level flow. After building `exercises` (line 130), add:

```tsx
  const chartExercises = exercises.filter((e) => {
    const t = (e.content_json as { type?: string } | null)?.type;
    return t === "chart_click" || t === "multiple_choice";
  });
```

Then replace subsequent uses of `exercises` in level logic with `chartExercises`: the `if (exercises.length === 0) notFound();` → `if (chartExercises.length === 0) notFound();`; `determineLevel(exercises, ...)` → `determineLevel(chartExercises, ...)`; the `exerciseIds` map and `pickExercise(exercises, ...)` → `chartExercises`.

For the "completed" next-lesson lookup (lines 149-157), replace the `module_id`-based query with a unit-aware one:

```tsx
    const { data: unitRow } = (await db
      .from("units")
      .select("id, module_id, order_index")
      .eq("id", lesson.unit_id)
      .single()) as { data: { id: string; module_id: string; order_index: number } | null };

    const { data: mUnits } = (await db
      .from("units")
      .select("id, order_index")
      .eq("module_id", unitRow?.module_id ?? "")
      .order("order_index")) as { data: { id: string; order_index: number }[] | null };

    const mUnitIds = (mUnits ?? []).map((u) => u.id);
    const { data: mLessons } = (await db
      .from("lessons")
      .select("*")
      .in("unit_id", mUnitIds.length > 0 ? mUnitIds : ["00000000-0000-0000-0000-000000000000"])) as {
      data: LessonRow[] | null;
    };

    const ordered = flattenModuleLessons(mUnits ?? [], mLessons ?? []);
    const idx = ordered.findIndex((l) => l.id === lessonId);
    const nextLesson = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
```

Add `import { flattenModuleLessons } from "@/lib/course/ordering";`. Keep the existing JSX that renders `nextLesson`.

- [ ] **Step 5: Render Topic → Unit → Lesson in the browse page + reparent unlock**

In `app/(student)/lessons/page.tsx`:

Add a units fetch to the `Promise.all` and change lesson ordering. Add this entry to `Promise.all`:

```tsx
    db.from("units").select("*").order("module_id").order("order_index") as unknown as Promise<{
      data: UnitRow[] | null;
    }>,
```

Destructure it as `{ data: unitsData }`. Change the lessons query `.order("module_id")` → `.order("unit_id")` (keep `.order("order_index")`). Import `UnitRow` and `flattenModuleLessons`.

Replace the `lessonsByModule` grouping (lines 75-80) with unit-aware grouping:

```tsx
  const allUnits = unitsData ?? [];
  const unitsByModule = new Map<string, UnitRow[]>();
  for (const u of allUnits) {
    const g = unitsByModule.get(u.module_id) ?? [];
    g.push(u);
    unitsByModule.set(u.module_id, g);
  }
  const lessonsByUnit = new Map<string, LessonRow[]>();
  for (const l of allLessons) {
    const g = lessonsByUnit.get(l.unit_id) ?? [];
    g.push(l);
    lessonsByUnit.set(l.unit_id, g);
  }
```

The unlock logic uses "previous lesson in the module's linear sequence." Build, per module, the flattened list and a prev-map:

```tsx
  const prevLessonInModule = new Map<string, LessonRow | undefined>();
  for (const module of allModules) {
    const mUnits = (unitsByModule.get(module.id) ?? []).sort((a, b) => a.order_index - b.order_index);
    const flat = flattenModuleLessons(mUnits, allLessons);
    flat.forEach((l, i) => prevLessonInModule.set(l.id, i > 0 ? flat[i - 1] : undefined));
  }
```

Change `isLessonUnlocked(lesson, prevLesson)` calls to use `prevLessonInModule.get(lesson.id)` instead of the previous-sibling-by-index. Replace the render (the `allModules.map` body, lines 108-229) so each module renders its units, and each unit renders its lessons. Keep the existing lesson `<li>` markup (locked/unlocked branches) unchanged; only the nesting changes. Structure:

```tsx
          {allModules.map((module) => {
            const mUnits = (unitsByModule.get(module.id) ?? []).sort((a, b) => a.order_index - b.order_index);
            const moduleLessonCount = mUnits.reduce((n, u) => n + (lessonsByUnit.get(u.id)?.length ?? 0), 0);
            if (moduleLessonCount === 0) return null;

            return (
              <section key={module.id} aria-labelledby={`module-${module.id}`}>
                <div className="mb-3">
                  <h2 id={`module-${module.id}`} className="font-heading text-lg font-bold text-foreground">
                    {module.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {mUnits.map((unit) => {
                    const unitLessons = (lessonsByUnit.get(unit.id) ?? []).sort((a, b) => a.order_index - b.order_index);
                    if (unitLessons.length === 0) return null;
                    return (
                      <Card key={unit.id}>
                        <CardHeader className="border-b border-border/50 pb-3 pt-3">
                          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {unit.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <ul className="divide-y divide-border/30">
                            {unitLessons.map((lesson, idx) => {
                              const prevLesson = prevLessonInModule.get(lesson.id);
                              const unlocked = isLessonUnlocked(lesson, prevLesson);
                              const completed = completedSet.has(lesson.id);
                              // ... keep the EXACT locked/unlocked <li> markup from the current file,
                              //     using `idx + 1` for the number badge.
                            })}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
```

Preserve the existing `<li>` locked and unlocked JSX blocks verbatim (the `LockIcon` / `PlayCircleIcon` / `CheckCircleIcon` markup) inside the `unitLessons.map`. Update `isLessonUnlocked`'s signature comment if needed but keep its body (it already takes `(lesson, prevLesson)`).

- [ ] **Step 6: Verify build**

Run: `pnpm lint && pnpm build`
Expected: PASS with no remaining `module_id` references on lessons. Grep to confirm:

Run: `grep -rn "\.module_id" app/ lib/ | grep -i lesson`
Expected: no results referencing `lesson.module_id` (units legitimately have `module_id`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(student): file-upload exercise + Topic→Unit→Lesson browsing | תרגיל העלאת קובץ וניווט תלת-שכבתי"
```

---

## Task 8: Manual end-to-end verification + auditor sweep

**Files:** none (verification only)

- [ ] **Step 1: Manual admin flow**

Start the app: `pnpm dev`. Log in as admin (`hagai@hagaigilis.test` / `Hagai!2026`).
- `/admin/modules` → create a נושא "תמיכה והתנגדות".
- "נהל יחידות" → create "יחידה 1".
- "נהל שיעורים" → create 3 שיעורים, one with a YouTube watch URL. Confirm the video saves (embed conversion).
- `/admin/exercises` → "תרגיל העלאת קובץ" → attach to one of the lessons, instructions text, required_files = 1, mode = manual_review. Save.
Expected: all created; exercise appears in the list labeled "העלאת קובץ" with a "הגשות" link.

- [ ] **Step 2: Manual student flow**

Log in as a student (create one via `/admin/students/new` if needed, or use an existing test student). 
- `/lessons` → see נושא → יחידה → שיעורים nesting; first lesson open, rest locked.
- Open the lesson with the file exercise → mark video complete → the "משימת הגשה" section appears with instructions → upload an image and a PDF → submit.
Expected: manual_review shows "ממתין לבדיקת המנהל"; auto_complete (test a second exercise) shows completed.

- [ ] **Step 3: Manual review flow**

Back as admin → `/admin/exercises/{id}/submissions` → see the student, download the file (link opens), click "אושר".
Then `/admin/students/{id}` → "הגשות קבצים" section shows the submission as אושר.
Expected: status flips to אושר in both places.

- [ ] **Step 4: Auditor sweep (parallel)**

Dispatch the three read-only auditors in a single message with parallel tool calls:
- `supabase-rls-checker` — verify `units` RLS, storage policies, and the new `exercise_submissions` admin UPDATE policy are correct and admin checks use the `profiles` subquery.
- `code-reviewer` — review all changed files for `any`, security leaks (service_role in client, unvalidated input), convention violations, over-engineering.
- `rtl-auditor` — verify all new UI (unit form, file exercise form, uploader, submissions pages, browse nesting) uses logical CSS, Hebrew strings, correct `dir` usage.

- [ ] **Step 5: Fix findings and commit**

Address any auditor findings. Commit fixes:

```bash
git add -A
git commit -m "fix: address auditor findings for course hierarchy + file exercise | תיקוני ביקורת"
```

- [ ] **Step 6: Update memory**

Append a project memory noting: 3-level hierarchy shipped (modules=נושא, units=יחידה, lessons=שיעור); file_upload exercise + `exercise-uploads` storage bucket; admin review both views. Convert the date to absolute (2026-07-06). Add the one-line pointer to `MEMORY.md`.

---

## Self-Review

**Spec coverage:**
- Admin add/remove Topics/Units/Lessons with YouTube link, name, description → Tasks 3 (units + lesson reparent), existing module CRUD, lesson form (Task 3).
- File-upload exercise (upload, stored for admin, instructions above) → Tasks 2, 5, 7.
- Attach exercise to a class → file exercise form's lesson select (Task 5).
- 3-level course structure נושא/יחידה/שיעור → Tasks 1, 3, 7.
- Admin access to all of it → `requireAdmin()` in every admin action/page (Tasks 3, 5, 6).
- Admin/student login info → delivered in chat (not a code task).
- Admin toggle needs-review vs auto-complete → Task 5 form `completion_mode`; Task 7 submit honors it.
- Required files count set by admin → Task 5 `required_files`; Task 7 enforces.
- Images + PDF only → Task 7 `ALLOWED` + `accept`.
- Review both views → Task 6.

**Placeholder scan:** No TBD/TODO. Steps that say "mirror/copy an existing file" name the exact source file and the exact deltas — acceptable because the source is in-repo and the changes are enumerated.

**Type consistency:** `flattenModuleLessons(units, lessons)` signature consistent across Tasks 4/7. `reviewFileSubmissionAction` fields (`submission_id`, `exercise_id`, `passed`) consistent between Task 6 action and `ReviewControls`. `submitFileUploadAction(formData)` returns `FileSubmitResult` consumed in the client component. `FileUploadExercise`/`FileUploadAnswer`/`UploadedFile` defined in Task 2, used in 5/6/7. `LessonRow.unit_id` replaces `module_id` consistently.
