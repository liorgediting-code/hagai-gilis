# Design: Optional Text Note on File-Upload Exercises

**Date**: 2026-08-11
**Status**: Approved

## Context

The `file_upload` exercise type already lets an admin create an exercise with a
title + instructions and a max-file cap, and lets students upload images/PDFs
against it. Admins can already review submissions per-exercise
(`/admin/exercises/[id]/submissions`) and per-student
(`FileSubmissionsCard` on the student detail page).

The one gap: students have no way to attach a text note to their submission,
and there's no admin control for whether that's allowed.

## Goal

Let the admin optionally enable a text field on a given file-upload exercise,
with a custom prompt/label. When enabled, students may (but are not required
to) type a note alongside their file upload. Admins see that note wherever
they already see the submission's files.

## Non-goals

- No new exercise type — this extends `file_upload` in place.
- No new database table or column — config and answer are both stored as
  `jsonb` on existing columns (`exercises.content_json`,
  `exercise_submissions.answer_data`).
- Text is always optional for the student, even when the admin enables the
  field (confirmed with user).

## Data model changes (types only, no migration)

`lib/types/exercise-types.ts`:

- `FileUploadExercise` gains:
  - `allow_text_answer?: boolean`
  - `text_prompt?: string` — admin-authored label shown to the student,
    required only when `allow_text_answer` is `true`.
- `FileUploadAnswer` gains:
  - `text_note?: string` — present only if the student typed something.
- `fileUploadSchema` (zod): add `.refine()` so `text_prompt` must be
  non-empty (max ~200 chars) when `allow_text_answer` is `true`.
- `fileUploadAnswerSchema` (zod): `text_note` optional string, max 2000
  chars.

## Admin form

`app/admin/exercises/file/_components/file-exercise-form.tsx`:

- Add a checkbox: "אפשר לתלמיד להשאיר הערת טקסט" bound to
  `allow_text_answer`.
- When checked, reveal a text input for the custom prompt (e.g. default
  placeholder "נמק את בחירתך") bound to `text_prompt`.
- `app/admin/exercises/file/actions.ts` `buildContent()`: read both fields
  from `FormData`, pass through `fileUploadSchema.safeParse`.

## Student submission

`app/(student)/lessons/[id]/exercise/_components/file-upload-exercise.tsx`:

- When `content.allow_text_answer` is true, render an optional `<textarea>`
  below the file input, labeled with `content.text_prompt`.

`app/(student)/lessons/[id]/exercise/file-actions.ts`
(`submitFileUploadAction`):

- Read `text_note` from `FormData`, trim it, validate length (≤2000 chars)
  with the zod schema.
- Include `text_note` in the `answer_data` insert only when non-empty;
  otherwise omit the key entirely (keeps existing submissions/shape
  consistent with today's `{ files }`-only rows).

## Admin review views

- `app/admin/exercises/[id]/submissions/page.tsx`: under each submission's
  file links, show the student's `text_note` if present (plain text block,
  same style as the exercise's own instructions block).
- `app/admin/students/[id]/_components/file-submissions-card.tsx`: same —
  show the note under the file count line if present.

Both already read `answer_data as FileUploadAnswer`, so this is just
rendering one more optional field — no new query needed.

## Error handling

- Student textarea has no `required` attribute; empty submissions proceed
  exactly as today.
- Server-side, an over-length note is a validation error surfaced the same
  way existing form errors are (`ActionState`/`FileSubmitResult` `error`
  string).
- Admin form: if `allow_text_answer` is checked but `text_prompt` is left
  empty, the zod refine rejects the submission with a Hebrew error message,
  consistent with other fields on this form.

## Testing

Manual verification (no test suite present for this app):

1. Create a file-upload exercise with the text note disabled — submission
   flow unchanged (no textarea shown).
2. Create/edit an exercise with the note enabled — verify the custom prompt
   appears, textarea is optional, and both a with-note and without-note
   submission work.
3. Verify admin sees the note in both the per-exercise submissions page and
   the per-student submissions card.
4. Verify editing an exercise to toggle `allow_text_answer` off after
   students have already left notes doesn't break rendering of past
   submissions (note still displays; new submissions just won't offer the
   field).
