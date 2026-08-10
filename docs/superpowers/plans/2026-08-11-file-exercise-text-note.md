# File-Upload Exercise Text Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin optionally enable a custom-labeled, always-optional text note on a `file_upload` exercise, so students can add context alongside their uploaded images, and admins can read that note wherever they already review submissions.

**Architecture:** Pure extension of the existing `file_upload` exercise type. Both exercise config (`exercises.content_json`) and submission answers (`exercise_submissions.answer_data`) are untyped `jsonb` columns already — no migration is needed. Add two optional fields to `FileUploadExercise` (`allow_text_answer`, `text_prompt`) and one to `FileUploadAnswer` (`text_note`), thread them through the admin form → server action → zod schema, and the student form → server action → zod schema, then render the note in the two existing admin review views.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (jsonb columns, no schema change), zod, react-hook-form-free native `<form action>` Server Actions (this codebase's existing pattern for these forms), Tailwind + shadcn/ui, Hebrew RTL.

## Global Constraints

- No `any` — untyped JSON reads go through existing `FileUploadExercise` / `FileUploadAnswer` types ([lib/types/exercise-types.ts](../../../lib/types/exercise-types.ts)).
- Tailwind utilities only, logical properties (`ms-*`/`me-*`/`text-start` etc.), never physical `ml-*`/`mr-*`/`text-left`.
- All user-facing strings in Hebrew.
- Server Action return shape: `{ success: true, data: T } | { success: false, error: string }` — this codebase's existing convention for these two actions is `ActionState`/`FileSubmitResult` (`{ status: "idle"|"success"|"error", error?, ... }`); match the existing shape in each file rather than introducing a new one.
- Always `revalidatePath()` after a Server Action mutation — both existing actions already do this; keep it.
- Validate all inputs with zod before touching the DB.
- Component names PascalCase, files kebab-case.
- No new database table, column, or RLS policy — this feature stays inside existing jsonb columns and existing policies.
- Text note is always optional for the student, even when the admin enables the field.

---

## File Structure

| File | Change |
|---|---|
| `lib/types/exercise-types.ts` | Add `allow_text_answer?`, `text_prompt?` to `FileUploadExercise`; add `text_note?` to `FileUploadAnswer`; update `fileUploadSchema` and `fileUploadAnswerSchema`. |
| `app/admin/exercises/file/_components/file-exercise-form.tsx` | Add checkbox + conditional text prompt input. |
| `app/admin/exercises/file/actions.ts` | Read the two new fields in `buildContent()`. |
| `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx` | Render optional textarea when `content.allow_text_answer`. |
| `app/(student)/lessons/[id]/exercise/file-actions.ts` | Read, validate, and persist `text_note` in `submitFileUploadAction`. |
| `app/admin/exercises/[id]/submissions/page.tsx` | Render `text_note` per submission. |
| `app/admin/students/[id]/_components/file-submissions-card.tsx` | Render `text_note` per submission. |

No new files. Every file above already exists and already owns exactly the responsibility being extended.

---

### Task 1: Extend types and zod schemas

**Files:**
- Modify: `lib/types/exercise-types.ts`

**Interfaces:**
- Produces: `FileUploadExercise.allow_text_answer?: boolean`, `FileUploadExercise.text_prompt?: string`, `FileUploadAnswer.text_note?: string`, updated `fileUploadSchema` (zod, exported), updated `fileUploadAnswerSchema` (zod, exported).

- [ ] **Step 1: Update the `FileUploadExercise` and `FileUploadAnswer` types**

In `lib/types/exercise-types.ts`, change:

```ts
export type FileUploadExercise = {
  type: "file_upload";
  instructions: string;
  /** Maximum number of files the student may upload (1..10). */
  max_files: number;
  /** @deprecated legacy fixed count — read via getMaxFiles(); migrated to max_files. */
  required_files?: number;
  completion_mode: "manual_review" | "auto_complete";
};
```

to:

```ts
export type FileUploadExercise = {
  type: "file_upload";
  instructions: string;
  /** Maximum number of files the student may upload (1..10). */
  max_files: number;
  /** @deprecated legacy fixed count — read via getMaxFiles(); migrated to max_files. */
  required_files?: number;
  completion_mode: "manual_review" | "auto_complete";
  /** When true, the student may (optionally) leave a text note alongside their upload. */
  allow_text_answer?: boolean;
  /** Admin-authored label shown to the student for the optional text note. Required when allow_text_answer is true. */
  text_prompt?: string;
};
```

And change:

```ts
export type FileUploadAnswer = {
  files: UploadedFile[];
};
```

to:

```ts
export type FileUploadAnswer = {
  files: UploadedFile[];
  /** Optional student-authored note, present only if they wrote one. */
  text_note?: string;
};
```

- [ ] **Step 2: Update `fileUploadSchema` to validate the new admin-side fields**

Replace:

```ts
export const fileUploadSchema = z.object({
  type: z.literal("file_upload"),
  instructions: z.string().min(1, "הוראות נדרשות").max(4000, "הוראות ארוכות מדי"),
  max_files: z.coerce.number().int().min(1, "נדרש לפחות קובץ אחד").max(10, "עד 10 קבצים"),
  completion_mode: z.enum(["manual_review", "auto_complete"]),
});
```

with:

```ts
export const fileUploadSchema = z.object({
  type: z.literal("file_upload"),
  instructions: z.string().min(1, "הוראות נדרשות").max(4000, "הוראות ארוכות מדי"),
  max_files: z.coerce.number().int().min(1, "נדרש לפחות קובץ אחד").max(10, "עד 10 קבצים"),
  completion_mode: z.enum(["manual_review", "auto_complete"]),
  allow_text_answer: z.boolean().default(false),
  text_prompt: z.string().max(200, "טקסט ההנחיה ארוך מדי").optional(),
}).refine(
  (data) => !data.allow_text_answer || (data.text_prompt !== undefined && data.text_prompt.trim().length > 0),
  { message: "טקסט הנחיה נדרש כאשר הערת טקסט מופעלת", path: ["text_prompt"] },
);
```

- [ ] **Step 3: Update `fileUploadAnswerSchema` to validate the new student-side field**

Replace:

```ts
export const fileUploadAnswerSchema = z.object({
  files: z.array(uploadedFileSchema).min(1, "נדרש להעלות לפחות קובץ אחד"),
});
```

with:

```ts
export const fileUploadAnswerSchema = z.object({
  files: z.array(uploadedFileSchema).min(1, "נדרש להעלות לפחות קובץ אחד"),
  text_note: z.string().max(2000, "ההערה ארוכה מדי").optional(),
});
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors. (`fileUploadSchema` is a zod `ZodEffects` after `.refine()` — if any caller destructures it as a plain `ZodObject`, e.g. via `.shape`, that call site needs to switch to `.innerType().shape` — check with `grep -rn "fileUploadSchema\." app lib` first; the current codebase only calls `.safeParse`, so this should be a no-op.)

- [ ] **Step 5: Commit**

```bash
git add lib/types/exercise-types.ts
git commit -m "$(cat <<'EOF'
feat(exercises): add optional text-note fields to file-upload type | הוספת שדה הערת טקסט אופציונלי לסוג תרגיל העלאת קובץ

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Admin form — enable/configure the text note

**Files:**
- Modify: `app/admin/exercises/file/_components/file-exercise-form.tsx`
- Modify: `app/admin/exercises/file/actions.ts`

**Interfaces:**
- Consumes: `FileUploadExercise` type from Task 1 (`allow_text_answer`, `text_prompt`), `fileUploadSchema` from Task 1.
- Produces: form now submits `allow_text_answer` (checkbox, `"on"`/absent) and `text_prompt` (string) fields; `buildContent()` in `actions.ts` passes them into `fileUploadSchema.safeParse`.

- [ ] **Step 1: Add the checkbox and conditional prompt input to the form**

`app/admin/exercises/file/_components/file-exercise-form.tsx` already has `"use client"` at the top (it uses `useActionState`). Add a local `useState` to toggle the prompt input's visibility.

Insert this block right after the `completion_mode` field's closing `</div>` (before the `order_index` field):

```tsx
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="allow_text_answer"
            name="allow_text_answer"
            type="checkbox"
            defaultChecked={defaultContent?.allow_text_answer ?? false}
            onChange={(e) => setAllowTextAnswer(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <Label htmlFor="allow_text_answer">אפשר לתלמיד להשאיר הערת טקסט (אופציונלי)</Label>
        </div>
        {allowTextAnswer && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="text_prompt">טקסט ההנחיה לתלמיד</Label>
            <Input
              id="text_prompt"
              name="text_prompt"
              defaultValue={defaultContent?.text_prompt ?? ""}
              placeholder="לדוגמה: נמק את בחירתך"
            />
          </div>
        )}
      </div>
```

Add the state hook right after the existing `useActionState` line:

```tsx
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [allowTextAnswer, setAllowTextAnswer] = useState(defaultContent?.allow_text_answer ?? false);
```

Add the import at the top with the other React import:

```tsx
import { useActionState, useState } from "react";
```

- [ ] **Step 2: Read the new fields in `buildContent()`**

In `app/admin/exercises/file/actions.ts`, change:

```ts
  const parsed = fileUploadSchema.safeParse({
    type: "file_upload",
    instructions: formData.get("instructions"),
    max_files: formData.get("max_files"),
    completion_mode: formData.get("completion_mode"),
  });
```

to:

```ts
  const parsed = fileUploadSchema.safeParse({
    type: "file_upload",
    instructions: formData.get("instructions"),
    max_files: formData.get("max_files"),
    completion_mode: formData.get("completion_mode"),
    allow_text_answer: formData.get("allow_text_answer") === "on",
    text_prompt: formData.get("text_prompt") || undefined,
  });
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual verification — create an exercise with the note enabled**

Run: `pnpm dev`, sign in as admin, go to `/admin/exercises`, create a new file-upload exercise. Check the new checkbox, type a prompt (e.g. "נמק את בחירתך"), save. Edit it again and confirm the checkbox is checked and the prompt is prefilled.

- [ ] **Step 5: Manual verification — leave the note disabled**

Create a second exercise leaving the checkbox unchecked. Confirm no `text_prompt` input was required and save succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/admin/exercises/file/_components/file-exercise-form.tsx app/admin/exercises/file/actions.ts
git commit -m "$(cat <<'EOF'
feat(admin): let admin enable a custom text-note prompt on file-upload exercises | אפשרות למנהל להפעיל הנחיית הערת טקסט בתרגילי העלאת קובץ

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Student submission — optional text note

**Files:**
- Modify: `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx`
- Modify: `app/(student)/lessons/[id]/exercise/file-actions.ts`

**Interfaces:**
- Consumes: `content.allow_text_answer`, `content.text_prompt` from `FileUploadExercise` (Task 1); `fileUploadAnswerSchema` from Task 1 is available but this action currently builds `answer_data` by hand (no schema call) — follow the existing pattern and validate the note length inline, matching how `max_files`/file type/size are already validated inline in this file rather than switching the whole action to schema-based validation.
- Produces: `FormData` field `text_note` (string, may be empty/absent); `answer_data.text_note` included in the insert only when non-empty.

- [ ] **Step 1: Add the optional textarea to the student form**

In `app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx`, insert this block inside the `<form>`, after the file input's closing `</div>` and before the `{error && ...}` line:

```tsx
        {content.allow_text_answer && (
          <div className="space-y-2">
            <label htmlFor="text_note" className="text-sm font-medium">
              {content.text_prompt} <span className="text-muted-foreground">(אופציונלי)</span>
            </label>
            <textarea
              id="text_note"
              name="text_note"
              rows={4}
              maxLength={2000}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        )}
```

- [ ] **Step 2: Read, trim, and validate the note length server-side**

In `app/(student)/lessons/[id]/exercise/file-actions.ts`, after the existing per-file validation loop (`for (const f of files) { ... }`) and before the upload loop (`const uploaded: UploadedFile[] = [];`), add:

```ts
  const rawNote = formData.get("text_note");
  const textNote = typeof rawNote === "string" ? rawNote.trim() : "";
  if (textNote.length > 2000) {
    return { status: "error", error: "ההערה ארוכה מדי" };
  }
```

- [ ] **Step 3: Include the note in the inserted `answer_data`**

Change:

```ts
  const { error: insErr } = (await supabase.from("exercise_submissions").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    attempt_number: nextAttempt,
    answer_data: { files: uploaded },
    passed,
    score_pct: null,
  })) as { error: unknown };
```

to:

```ts
  const { error: insErr } = (await supabase.from("exercise_submissions").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    attempt_number: nextAttempt,
    answer_data: textNote ? { files: uploaded, text_note: textNote } : { files: uploaded },
    passed,
    score_pct: null,
  })) as { error: unknown };
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manual verification — submit with and without a note**

As a student, open the lesson with the note-enabled exercise from Task 2. Confirm the textarea appears with the custom prompt and "(אופציונלי)" suffix. Submit once with text in the note, and (using a second attempt if `completion_mode` allows re-submission, or a second test exercise) once with the note left empty. Confirm both submissions succeed.

Then open the lesson with the note-disabled exercise from Task 2 and confirm no textarea renders.

- [ ] **Step 6: Commit**

```bash
git add "app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx" "app/(student)/lessons/[id]/exercise/file-actions.ts"
git commit -m "$(cat <<'EOF'
feat(course): let student optionally leave a text note with file-upload submission | אפשרות לתלמיד להשאיר הערת טקסט אופציונלית בהגשת קובץ

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Admin review views — display the text note

**Files:**
- Modify: `app/admin/exercises/[id]/submissions/page.tsx`
- Modify: `app/admin/students/[id]/_components/file-submissions-card.tsx`

**Interfaces:**
- Consumes: `FileUploadAnswer.text_note` from Task 1; both files already cast `s.answer_data as FileUploadAnswer | null` (per-exercise page) or read `answer_data` via the `FileSubmission` local type (student card) — the student card's local `FileUploadAnswer` import already exists too.

- [ ] **Step 1: Render the note in the per-exercise submissions page**

In `app/admin/exercises/[id]/submissions/page.tsx`, inside the `submissions.map((s) => { ... })` block, change:

```tsx
                const p = profileMap.get(s.user_id);
                const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
                const st = statusLabel(s.passed);
```

to:

```tsx
                const p = profileMap.get(s.user_id);
                const answer = s.answer_data as FileUploadAnswer | null;
                const files = answer?.files ?? [];
                const textNote = answer?.text_note;
                const st = statusLabel(s.passed);
```

Then, inside the `<div className="flex-1 space-y-1">` block, after the `<div className="flex flex-wrap gap-2 pt-1">...</div>` files block closes, add:

```tsx
                      {textNote && (
                        <p className="whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2 text-xs text-foreground">
                          {textNote}
                        </p>
                      )}
```

- [ ] **Step 2: Render the note in the per-student submissions card**

`app/admin/students/[id]/_components/file-submissions-card.tsx` already imports `FileUploadAnswer` — no import change needed.

Change:

```tsx
          {fileSubs.map((s) => {
            const files = (s.answer_data as FileUploadAnswer | null)?.files ?? [];
            const label = s.passed === true ? "אושר" : s.passed === false ? "נדחה" : "ממתין לבדיקה";
```

to:

```tsx
          {fileSubs.map((s) => {
            const answer = s.answer_data as FileUploadAnswer | null;
            const files = answer?.files ?? [];
            const textNote = answer?.text_note;
            const label = s.passed === true ? "אושר" : s.passed === false ? "נדחה" : "ממתין לבדיקה";
```

Then, inside the `<div className="flex-1">` block, after the `<p className="text-xs text-muted-foreground">{files.length} קבצים · {formatDate(s.submitted_at)}</p>` line, add:

```tsx
                  {textNote && (
                    <p className="whitespace-pre-wrap pt-1 text-xs text-foreground">{textNote}</p>
                  )}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

As admin, open `/admin/exercises/[id]/submissions` for the note-enabled exercise from Task 2/3 and confirm the student's note text appears under their file links for the submission that included one, and nothing extra renders for the submission that didn't.

Then open that student's profile page (`/admin/students/[id]`) and confirm the same note appears in the file-submissions card.

- [ ] **Step 5: Commit**

```bash
git add app/admin/exercises/\[id\]/submissions/page.tsx "app/admin/students/[id]/_components/file-submissions-card.tsx"
git commit -m "$(cat <<'EOF'
feat(admin): show student text note in submission review views | הצגת הערת הטקסט של התלמיד במסכי בדיקת הגשות

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

- [ ] Run `pnpm exec tsc --noEmit && pnpm lint` from repo root — zero errors.
- [ ] Run `pnpm build` — production build succeeds.
- [ ] Full manual walkthrough on a 375px mobile viewport: admin creates a note-enabled exercise → student submits with a note → admin sees it in both review views → admin creates a note-disabled exercise → student submits with no textarea shown.
- [ ] `git log --oneline -5` shows the four feature commits from Tasks 1–4.
