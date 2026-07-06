# Admin Delete User — Design

**Date**: 2026-07-06
**Status**: Approved design, pending implementation plan

## Goal

Let the sole admin permanently delete a student from the student detail page. Deleting removes the student's Supabase Auth account, which cascades to all their app data. The action is irreversible and guarded by a confirmation dialog.

## Decisions

- **Placement**: Detail page only (`/admin/students/[id]`). No delete on the list page.
- **Confirmation**: shadcn `AlertDialog` showing name + email and a permanence warning. One deliberate confirm click. No type-to-confirm.
- **Deletion depth**: Hard delete of the auth user. No soft-delete / archive.

## Why no migration is needed

Every table holding student data already declares `ON DELETE CASCADE` against `auth.users(id)`:

| Table | Column | On delete |
|---|---|---|
| `profiles` | `id` → `auth.users(id)` | CASCADE |
| `lesson_progress` | `user_id` | CASCADE |
| `user_permissions` | `user_id` | CASCADE |
| `exercise_submissions` | `user_id` | CASCADE |
| `lesson_unlocks` | `user_id` | CASCADE |
| `market_posts` | `author_id` | SET NULL (posts remain, author anonymized) |

Deleting `auth.users` row via the admin API triggers all of the above. No schema change.

## Components

### 1. Server Action — `deleteStudentAction`

Location: `app/admin/students/[id]/actions.ts` (append to existing file, mirror `lockLessonAction` / invite-action patterns).

Signature: `(_prev: ActionState, formData: FormData) => Promise<ActionState>`

Steps:
1. `await requireAdmin()` — gate; re-queries `profiles.role` server-side.
2. Zod-validate `user_id` (uuid) from `formData`. On failure return `{ status: "error", error: "קלט לא תקין" }`.
3. Resolve the acting admin's own id (via `getProfile()` / `require-admin` return, or `createClient().auth.getUser()`).
4. **Safety checks** using the admin client to fetch the target profile:
   - If target `role === "admin"` → return `{ status: "error", error: "לא ניתן למחוק חשבון מנהל" }`.
   - If `user_id === actingAdminId` → return `{ status: "error", error: "לא ניתן למחוק את החשבון שלך" }`.
   - If target profile not found → return `{ status: "error", error: "התלמיד לא נמצא" }`.
5. `createAdminClient().auth.admin.deleteUser(user_id)`. On error return `{ status: "error", error: "שגיאה במחיקת התלמיד — נסה שנית" }`.
6. On success: `revalidatePath("/admin/students")`, then `redirect("/admin/students")` (the detail page's subject no longer exists).

Notes:
- `redirect()` throws internally; it must be called **outside** any try/catch that would swallow it, after the delete succeeds.
- Service-role key stays server-only via the existing `lib/supabase/admin.ts` (`import "server-only"`).

### 2. UI — `DeleteStudentButton` (client component)

Location: new file `app/admin/students/[id]/delete-student-button.tsx`, exporting `DeleteStudentButton`.

Props: `{ userId: string; fullName: string | null; email: string }`.

Behavior:
- Destructive-styled trigger: **"מחיקת התלמיד"**.
- shadcn `AlertDialog`:
  - Title: **"מחיקת תלמיד"**
  - Description: names the student (`fullName ?? "התלמיד"`) + email, warns the action is permanent and erases all their data (progress, submissions, permissions).
  - Cancel: **"ביטול"**. Confirm: **"מחק לצמיתות"** (destructive).
- Uses React 19 `useActionState` + `useTransition` (matches this repo's auth-form pattern; not react-hook-form). Pending state disables confirm and shows **"מוחק…"**.
- On `status === "error"`, render the Hebrew error inline in the dialog (do not close).
- On success the action redirects, so no client-side success handling is needed beyond the pending state.

### 3. Detail page wiring

Location: `app/admin/students/[id]/page.tsx`.

- Add a **"אזור מסוכן"** (Danger Zone) `Card` at the bottom of the page, visually distinct (destructive border/accent via existing tokens — no inline styles).
- Render `<DeleteStudentButton userId={student.id} fullName={student.full_name} email={student.email} />` inside it.

### 4. shadcn dependency

- `alert-dialog` component. Check `components/ui/` first; if absent run `pnpm dlx shadcn@latest add alert-dialog`. (Repo uses the shadcn base-ui variant — verify `AlertDialog` primitives render and `asChild` is avoided per the known base-ui limitation; use `buttonVariants` on triggers if needed.)

## RTL / Hebrew

- All strings Hebrew. Logical CSS utilities only. Dialog inherits root `dir="rtl"`.
- No new directional icons. If a trash icon is added it is non-directional (no flip).
- Email displayed `dir="ltr"`.

## Error handling

- Invalid input, admin-target, self-delete, not-found, and API failure each return a distinct Hebrew message surfaced in the dialog.
- Success path redirects to the list; a stale detail route will 404, which is expected.

## Out of scope

- Bulk delete, list-page delete, soft-delete/restore, audit log of deletions, email notification to the deleted user.

## Post-build audits (per CLAUDE.md)

Run in parallel after the build:
- `code-reviewer` — conventions, no `any`, error handling, over-engineering.
- `rtl-auditor` — Hebrew strings, logical properties, dialog direction.
- Confirm the service-role key never reaches client code (grep for `SUPABASE_SERVICE_ROLE_KEY` / admin-client imports in `"use client"` files).
