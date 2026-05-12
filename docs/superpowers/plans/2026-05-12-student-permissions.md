# Student Market Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin toggle to grant/revoke/block each student's access to the market (news feed) section, complementing the existing lessons/exercises/summaries permission toggles.

**Architecture:** Add `'market_deny'` as a new page key to the `user_permissions` CHECK constraint. The market page checks for explicit deny first, then explicit grant, then auto-logic (all lessons completed). A new `MarketPermissionToggle` client component handles the 4-state UI. A new server action `toggleMarketPermissionAction` performs the DB operations.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres, React `useActionState`, Tailwind CSS, shadcn/ui, zod

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/20260512000000_market_deny.sql` | **Create** — widen CHECK constraint |
| `lib/types/course-types.ts` | **Modify** — add `'market_deny'` to `PageKey` and `UserPermissionRow` |
| `app/admin/students/permissions/actions.ts` | **Modify** — add `toggleMarketPermissionAction` |
| `app/admin/students/[id]/_components/market-permission-toggle.tsx` | **Create** — 4-state toggle component |
| `app/admin/students/[id]/page.tsx` | **Modify** — compute `marketState`, render `<MarketPermissionToggle>` |
| `app/(student)/market/page.tsx` | **Modify** — add `isDenied` check before `isGranted` |

---

## Task 1: DB Migration — add `market_deny` page key

**Files:**
- Create: `supabase/migrations/20260512000000_market_deny.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 20260512000000_market_deny.sql
-- Allow admins to explicitly block market access (even after all lessons completed)

ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_page_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_page_check
  CHECK (page IN ('lessons', 'exercises', 'summaries', 'market', 'market_deny'));
```

- [ ] **Step 2: Apply the migration**

```bash
pnpm supabase db push
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260512000000_market_deny.sql
git commit -m "feat(db): add market_deny to user_permissions page constraint | הוספת ערך market_deny לטבלת הרשאות"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `lib/types/course-types.ts:36-42`

- [ ] **Step 1: Widen `UserPermissionRow` and `PageKey`**

In `lib/types/course-types.ts`, replace:

```ts
export type UserPermissionRow = {
  user_id: string;
  page: "lessons" | "exercises" | "summaries" | "market";
  created_at: string;
};

export type PageKey = "lessons" | "exercises" | "summaries" | "market";
```

with:

```ts
export type UserPermissionRow = {
  user_id: string;
  page: "lessons" | "exercises" | "summaries" | "market" | "market_deny";
  created_at: string;
};

export type PageKey = "lessons" | "exercises" | "summaries" | "market" | "market_deny";
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
pnpm build 2>&1 | head -40
```

Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types/course-types.ts
git commit -m "feat(types): add market_deny to PageKey and UserPermissionRow | עדכון טיפוסים"
```

---

## Task 3: Server Action — `toggleMarketPermissionAction`

**Files:**
- Modify: `app/admin/students/permissions/actions.ts`

- [ ] **Step 1: Add the action to the existing file**

Append to `app/admin/students/permissions/actions.ts`:

```ts
const marketActionSchema = z.object({
  user_id: z.string().uuid("מזהה משתמש לא תקין"),
  action: z.enum(["grant", "revoke_grant", "deny", "revoke_deny"], {
    errorMap: () => ({ message: "פעולה לא תקינה" }),
  }),
});

export async function toggleMarketPermissionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = marketActionSchema.safeParse({
    user_id: formData.get("user_id"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const { user_id, action } = parsed.data;
  const supabase = asUntyped(await createClient());

  if (action === "grant") {
    await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market_deny");
    const { error } = await supabase.from("user_permissions").insert({ user_id, page: "market" });
    if (error && error.code !== "23505") return { status: "error", error: "שגיאה בפתיחת גישה" };
  } else if (action === "revoke_grant") {
    const { error } = await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market");
    if (error) return { status: "error", error: "שגיאה בביטול הגישה" };
  } else if (action === "deny") {
    await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market");
    const { error } = await supabase.from("user_permissions").insert({ user_id, page: "market_deny" });
    if (error && error.code !== "23505") return { status: "error", error: "שגיאה בחסימת גישה" };
  } else {
    const { error } = await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market_deny");
    if (error) return { status: "error", error: "שגיאה בהסרת החסימה" };
  }

  revalidatePath("/admin/students/[id]", "page");
  return { status: "success" };
}
```

Note: error code `"23505"` is Postgres unique violation — safe to ignore on upsert-like inserts.

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/students/permissions/actions.ts
git commit -m "feat(admin): add toggleMarketPermissionAction | פעולת שרת לשליטה בגישה למניות"
```

---

## Task 4: New component — `MarketPermissionToggle`

**Files:**
- Create: `app/admin/students/[id]/_components/market-permission-toggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useActionState } from "react";
import { LockIcon, UnlockIcon, CheckCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleMarketPermissionAction } from "@/app/admin/students/permissions/actions";
import type { ActionState } from "@/app/(auth)/actions";

export type MarketState = "locked" | "early_grant" | "auto_open" | "blocked";

interface MarketPermissionToggleProps {
  userId: string;
  marketState: MarketState;
}

const initial: ActionState = { status: "idle" };

function ActionForm({
  userId,
  action,
  label,
  variant,
  isPending,
  formAction,
}: {
  userId: string;
  action: string;
  label: string;
  variant: "default" | "outline" | "ghost" | "destructive";
  isPending: boolean;
  formAction: (payload: FormData) => void;
}) {
  return (
    <form action={formAction}>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="action" value={action} />
      <Button type="submit" variant={variant} size="sm" disabled={isPending} className="min-h-9">
        {isPending ? "..." : label}
      </Button>
    </form>
  );
}

export function MarketPermissionToggle({ userId, marketState }: MarketPermissionToggleProps) {
  const [state, formAction, isPending] = useActionState(toggleMarketPermissionAction, initial);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        {marketState === "blocked" ? (
          <LockIcon className="size-4 text-destructive" aria-hidden="true" />
        ) : marketState === "auto_open" || marketState === "early_grant" ? (
          <UnlockIcon className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <LockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-foreground">מניות</span>
        {marketState === "blocked" && (
          <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            חסום
          </span>
        )}
        {marketState === "early_grant" && (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
            פתוח ידנית
          </span>
        )}
        {marketState === "auto_open" && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            הושלמו שיעורים
          </span>
        )}
        {marketState === "locked" && (
          <span className="text-xs text-muted-foreground">ממתין להשלמת שיעורים</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {marketState === "locked" && (
          <ActionForm userId={userId} action="grant" label="פתח גישה מוקדמת" variant="outline" isPending={isPending} formAction={formAction} />
        )}
        {marketState === "early_grant" && (
          <>
            <ActionForm userId={userId} action="revoke_grant" label="בטל פתיחה" variant="ghost" isPending={isPending} formAction={formAction} />
            <ActionForm userId={userId} action="deny" label="חסום" variant="destructive" isPending={isPending} formAction={formAction} />
          </>
        )}
        {marketState === "auto_open" && (
          <ActionForm userId={userId} action="deny" label="חסום גישה" variant="ghost" isPending={isPending} formAction={formAction} />
        )}
        {marketState === "blocked" && (
          <ActionForm userId={userId} action="revoke_deny" label="הסר חסימה" variant="outline" isPending={isPending} formAction={formAction} />
        )}
      </div>

      {state.status === "error" && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/students/[id]/_components/market-permission-toggle.tsx
git commit -m "feat(admin): add MarketPermissionToggle component | רכיב טוגל לגישה למניות"
```

---

## Task 5: Update admin student detail page

**Files:**
- Modify: `app/admin/students/[id]/page.tsx`

- [ ] **Step 1: Add import for `MarketPermissionToggle`**

At the top of the file, add to the existing import block:

```ts
import { MarketPermissionToggle, type MarketState } from "./_components/market-permission-toggle";
```

- [ ] **Step 2: Compute `marketState` from existing data**

In `app/admin/students/[id]/page.tsx`, after the `const denied = new Set(...)` line (around line 95), add:

```ts
const hasMarketGrant = (deniedRows ?? []).some((r) => r.page === "market");
const hasMarketDeny  = (deniedRows ?? []).some((r) => r.page === "market_deny");
const allLessonsCompleted =
  (lessons ?? []).length > 0 &&
  (progress ?? []).filter((p) => p.completed_at !== null).length >= (lessons ?? []).length;

const marketState: MarketState =
  hasMarketDeny   ? "blocked"     :
  hasMarketGrant  ? "early_grant" :
  allLessonsCompleted ? "auto_open" :
  "locked";
```

- [ ] **Step 3: Render the toggle inside the permissions card**

In the "הרשאות גישה לעמודים" `CardContent`, after the `{pageLabels.map(...)}` block, add:

```tsx
<MarketPermissionToggle userId={id} marketState={marketState} />
```

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/admin/students/[id]/page.tsx
git commit -m "feat(admin): render MarketPermissionToggle in student detail | הצגת טוגל מניות בדף תלמיד"
```

---

## Task 6: Update student market page

**Files:**
- Modify: `app/(student)/market/page.tsx`

- [ ] **Step 1: Replace the `Promise.all` destructure to add a `market_deny` query**

In `app/(student)/market/page.tsx`, replace the entire `Promise.all` block:

```ts
const [
  { data: grantRow },
  { data: allLessons },
  { data: progressRows },
  { data: posts },
] = await Promise.all([
  db
    .from("user_permissions")
    .select("page")
    .eq("user_id", user.id)
    .eq("page", "market")
    .maybeSingle() as unknown as Promise<{ data: UserPermissionRow | null }>,
  db
    .from("lessons")
    .select("id") as unknown as Promise<{ data: LessonRow[] | null }>,
  db
    .from("lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", user.id) as unknown as Promise<{
    data: Pick<LessonProgressRow, "lesson_id" | "completed_at">[] | null;
  }>,
  db
    .from("market_posts")
    .select("*")
    .order("created_at", { ascending: false }) as unknown as Promise<{
    data: MarketPostRow[] | null;
  }>,
]);
```

with:

```ts
const [
  { data: grantRow },
  { data: denyRow },
  { data: allLessons },
  { data: progressRows },
  { data: posts },
] = await Promise.all([
  db
    .from("user_permissions")
    .select("page")
    .eq("user_id", user.id)
    .eq("page", "market")
    .maybeSingle() as unknown as Promise<{ data: UserPermissionRow | null }>,
  db
    .from("user_permissions")
    .select("page")
    .eq("user_id", user.id)
    .eq("page", "market_deny")
    .maybeSingle() as unknown as Promise<{ data: UserPermissionRow | null }>,
  db
    .from("lessons")
    .select("id") as unknown as Promise<{ data: LessonRow[] | null }>,
  db
    .from("lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", user.id) as unknown as Promise<{
    data: Pick<LessonProgressRow, "lesson_id" | "completed_at">[] | null;
  }>,
  db
    .from("market_posts")
    .select("*")
    .order("created_at", { ascending: false }) as unknown as Promise<{
    data: MarketPostRow[] | null;
  }>,
]);
```

- [ ] **Step 2: Update access logic**

Replace:

```ts
const hasExplicitGrant = grantRow !== null;
// ...
const isGranted = hasExplicitGrant || allLessonsCompleted;

if (!isGranted) {
```

with:

```ts
const hasExplicitGrant = grantRow !== null;
const hasExplicitDeny  = denyRow !== null;

const isGranted = !hasExplicitDeny && (hasExplicitGrant || allLessonsCompleted);

if (!isGranted) {
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(student)/market/page.tsx
git commit -m "feat(market): respect market_deny override in access check | כיבוד חסימה ידנית בעמוד מניות"
```

---

## Task 7: Push and smoke test

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Manual smoke test — admin side**

1. Open `/admin/students/[id]` for any student
2. Verify the "הרשאות גישה לעמודים" card now has a 4th row: מניות
3. If student hasn't completed all lessons → state shows "ממתין להשלמת שיעורים" with "פתח גישה מוקדמת" button
4. Click "פתח גישה מוקדמת" → row changes to "פתוח ידנית" badge, two buttons appear
5. Click "בטל פתיחה" → reverts to locked state
6. Click "פתח גישה מוקדמת" again → then click "חסום" → state shows "חסום" badge
7. Click "הסר חסימה" → reverts to locked

- [ ] **Step 3: Manual smoke test — student side**

1. Log in as the student whose market was just blocked
2. Navigate to `/market` → should see the locked card even if they had previously completed lessons
3. Go back to admin, remove the block → student refreshes → should see feed
