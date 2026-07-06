# Admin Delete User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin permanently delete a student from the student detail page, wiping their auth account and all cascaded data, behind a confirmation dialog.

**Architecture:** One new Server Action (`deleteStudentAction`) appended to the existing student actions file, using the service-role admin client to call `auth.admin.deleteUser`. One new client component (`DeleteStudentButton`) that opens the existing base-ui `Dialog` to confirm, then submits a form to the action. A "Danger Zone" card on the detail page renders the button.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), Supabase service-role admin client, `@base-ui/react` Dialog, Tailwind, zod.

## Global Constraints

- Package manager: `pnpm` only — never `npm`/`yarn`.
- Server Components by default; `"use client"` only where hooks/handlers are needed.
- Mutations via Server Actions returning `ActionState = { status: "idle" | "success" | "error"; error?: string }`. Never throw to the client.
- `revalidatePath()` after every mutation.
- Service-role key server-only — `createAdminClient()` from `@/lib/supabase/admin` (guarded by `import "server-only"`). Never import into a `"use client"` file.
- Admin gate: `await requireAdmin()` (re-queries `profiles.role` server-side). Never trust client role.
- Validate all inputs with zod before touching the DB.
- All user-facing strings in Hebrew. Logical CSS utilities only (`ms/me/ps/pe/start/end`), no physical `ml/mr/pl/pr/left/right`. No inline `style={}`.
- No `any` — use `unknown` and narrow, or the repo's `asUntyped` helper.
- File names `kebab-case.tsx`; component names `PascalCase`. Components under 200 lines.
- Email displayed with `dir="ltr"`.

---

### Task 1: `deleteStudentAction` Server Action

**Files:**
- Modify: `app/admin/students/[id]/actions.ts` (append new action; add `createAdminClient` + `redirect` imports)

**Interfaces:**
- Consumes: `requireAdmin()` → `{ user: { id: string } }`; `createAdminClient()` → service-role Supabase client with `.auth.admin.deleteUser(id)` and `.from("profiles")`; `ActionState` from `@/app/(auth)/actions`.
- Produces: `deleteStudentAction(_prev: ActionState, formData: FormData): Promise<ActionState>` — consumed by Task 2.

- [ ] **Step 1: Add imports at the top of `actions.ts`**

The file currently imports (lines 1-9): `revalidatePath`, `z`, `createClient`, `asUntyped`, `requireAdmin`, `ActionState`. Add two imports:

```typescript
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
```

Place `import { redirect } from "next/navigation";` directly under `import { revalidatePath } from "next/cache";`, and `import { createAdminClient } from "@/lib/supabase/admin";` in the `@/` import group next to the other `@/lib/supabase` imports.

- [ ] **Step 2: Append the delete action and its schema to the end of `actions.ts`**

```typescript
const deleteStudentSchema = z.object({
  user_id: z.string().uuid(),
});

export async function deleteStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user: adminUser } = await requireAdmin();

  const parsed = deleteStudentSchema.safeParse({
    user_id: formData.get("user_id"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  const targetId = parsed.data.user_id;

  if (targetId === adminUser.id) {
    return { status: "error", error: "לא ניתן למחוק את החשבון שלך" };
  }

  const admin = createAdminClient();

  const { data: target } = (await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .single()) as { data: { role: string } | null };

  if (!target) return { status: "error", error: "התלמיד לא נמצא" };
  if (target.role === "admin") {
    return { status: "error", error: "לא ניתן למחוק חשבון מנהל" };
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    return { status: "error", error: "שגיאה במחיקת התלמיד — נסה שנית" };
  }

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
```

Note: `redirect()` throws a Next.js control-flow signal, so it must be the last statement and must not sit inside a try/catch. On success the function never returns — the redirect handles navigation. The `Promise<ActionState>` return type stays valid because `redirect` is typed `never`.

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors introduced by `actions.ts`). If `single()` resolves to `never` per the known `@supabase/ssr` generics quirk, the explicit `as { data: { role: string } | null }` cast already handles it — leave it in place.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/students/[id]/actions.ts"
git commit -m "feat(admin): deleteStudentAction server action | פעולת מחיקת תלמיד"
```

---

### Task 2: `DeleteStudentButton` client component

**Files:**
- Create: `app/admin/students/[id]/_components/delete-student-button.tsx`

**Interfaces:**
- Consumes: `deleteStudentAction` from `../actions` (Task 1); `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` from `@/components/ui/dialog`; `Button` from `@/components/ui/button`; `ActionState` from `@/app/(auth)/actions`; `useActionState` from React 19.
- Produces: `DeleteStudentButton(props: { userId: string; fullName: string | null; email: string })` — consumed by Task 3.

- [ ] **Step 1: Create the component file**

```tsx
"use client";

import { useActionState } from "react";

import { deleteStudentAction } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  userId: string;
  fullName: string | null;
  email: string;
}

const initial: ActionState = { status: "idle" };

export function DeleteStudentButton({ userId, fullName, email }: Props) {
  const [state, action, pending] = useActionState(deleteStudentAction, initial);

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="destructive" />}>
        מחיקת התלמיד
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>מחיקת תלמיד</DialogTitle>
          <DialogDescription>
            פעולה זו תמחק לצמיתות את {fullName ?? "התלמיד"}{" "}
            (<span dir="ltr">{email}</span>) ואת כל הנתונים שלו — התקדמות,
            הגשות תרגילים והרשאות. לא ניתן לשחזר.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <input type="hidden" name="user_id" value={userId} />
          {state.status === "error" && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              ביטול
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "מוחק…" : "מחק לצמיתות"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Notes:
- Base-ui `Dialog` is uncontrolled: submitting the form does NOT close it, so an error message stays visible. Only `DialogClose` (the "ביטול" button) closes it. On success `deleteStudentAction` redirects away, so no client success handling is needed.
- `render={<Button .../>}` is the base-ui pattern for styling a trigger/close as a Button (this repo uses base-ui, not radix; `asChild` is not supported). It mirrors existing usage in `components/ui/dialog.tsx`.
- Strings are Hebrew; email is wrapped in `dir="ltr"`. No physical CSS.

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. If a `render`-prop type mismatch appears on `DialogTrigger`/`DialogClose`, confirm the prop shape against the existing `DialogClose render={<Button .../>}` usage in `components/ui/dialog.tsx:112` and match it exactly.

- [ ] **Step 3: Lint**

Run: `pnpm exec eslint "app/admin/students/[id]/_components/delete-student-button.tsx"`
Expected: PASS (no `any`, no unused imports).

- [ ] **Step 4: Commit**

```bash
git add "app/admin/students/[id]/_components/delete-student-button.tsx"
git commit -m "feat(admin): DeleteStudentButton confirm dialog | כפתור מחיקת תלמיד"
```

---

### Task 3: Danger Zone card on the detail page

**Files:**
- Modify: `app/admin/students/[id]/page.tsx` (add import; add card before the closing `</div>` at line ~254)

**Interfaces:**
- Consumes: `DeleteStudentButton` from Task 2; existing `profile` object in scope (`profile.id`, `profile.full_name`, `profile.email`); existing `Card`, `CardHeader`, `CardTitle`, `CardContent`.

- [ ] **Step 1: Add the import**

Add next to the other local component imports (after line 9, the `MarketPermissionToggle` import):

```typescript
import { DeleteStudentButton } from "./_components/delete-student-button";
```

- [ ] **Step 2: Add the Danger Zone card as the last child inside the top-level `<div className="space-y-6">`**

Insert immediately before the closing `</div>` that ends the returned JSX (currently line 254, right after the "Lesson unlock controls" card block):

```tsx
      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold text-destructive">
            אזור מסוכן
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            מחיקת התלמיד תסיר לצמיתות את חשבונו ואת כל הנתונים שלו. לא ניתן לשחזר.
          </p>
          <DeleteStudentButton
            userId={profile.id}
            fullName={profile.full_name}
            email={profile.email}
          />
        </CardContent>
      </Card>
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: PASS. The page stays a Server Component; `DeleteStudentButton` is the only `"use client"` island.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/students/[id]/page.tsx"
git commit -m "feat(admin): danger zone delete card on student page | אזור מסוכן למחיקת תלמיד"
```

---

### Task 4: Manual verification + audits

**Files:** none (verification only)

- [ ] **Step 1: Run the app and exercise the flow**

Run: `pnpm dev`
Manual checks (log in as admin `hagai@hagaigilis.test`):
1. Open a student at `/admin/students/[id]` → "אזור מסוכן" card renders at the bottom with a destructive "מחיקת התלמיד" button.
2. Click it → dialog shows the student's name + email (email LTR) and the permanence warning.
3. "ביטול" closes the dialog with no change.
4. "מחק לצמיתות" → redirects to `/admin/students`, and the student no longer appears in the list.
5. Confirm in Supabase (or via a fresh query) that the auth user and profile row are gone.

- [ ] **Step 2: Confirm service-role key is not bundled to the client**

Run: `grep -rn "createAdminClient\|SUPABASE_SERVICE_ROLE_KEY" app/ components/ | grep -i "use client" || echo "clean"`
Also verify `delete-student-button.tsx` imports only `deleteStudentAction` (a server action) and no admin client.
Expected: no client component imports the admin client.

- [ ] **Step 3: Run read-only auditors in parallel (per CLAUDE.md)**

Dispatch in a single message:
- `code-reviewer` on the three changed files — conventions, no `any`, error handling, over-engineering.
- `rtl-auditor` on `delete-student-button.tsx` and the page change — Hebrew strings, logical CSS, dialog direction, email `dir="ltr"`.

Apply any fixes they surface, then re-run `pnpm build`.

- [ ] **Step 4: Push**

```bash
git push origin claude/intelligent-germain-f822d1
```

---

## Self-Review

- **Spec coverage:** Server Action (Task 1), safety guards self/admin/not-found (Task 1 Step 2), UI dialog (Task 2), Danger Zone card (Task 3), RTL/Hebrew (constraints + Task 2/3), audits + service-role check (Task 4). No migration task — spec confirms cascades exist. All covered.
- **Placeholders:** none — every code step shows full code.
- **Type consistency:** `deleteStudentAction(_prev, formData): Promise<ActionState>` defined in Task 1, imported identically in Task 2; `DeleteStudentButton` prop shape `{ userId, fullName, email }` matches between Task 2 definition and Task 3 usage; `requireAdmin()` returns `{ user }` as used in the existing `unlockLessonAction`.
