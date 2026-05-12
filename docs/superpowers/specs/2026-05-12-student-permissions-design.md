# Student Permission Management — Design Spec
Date: 2026-05-12

## Goal

Allow Hagai (admin) to control each student's access to every section of the app from `/admin/students/[id]`. Sections: שיעורים, תרגולים, סיכומים, מניות (פיד חדשות).

## Current State

`user_permissions` table with `page CHECK ('lessons', 'exercises', 'summaries', 'market')`:
- `lessons`, `exercises`, `summaries`: deny-list (row = blocked)
- `market`: grant-list (row = explicitly granted)

Market auto-logic: `hasExplicitGrant || allLessonsCompleted`

Admin UI at `/admin/students/[id]` has toggles for lessons/exercises/summaries but **no market toggle**.

## What's Missing

A market permission toggle with both early-grant and force-block capabilities.

## Chosen Approach: Add `market_deny` page key

Minimal DB change — add `'market_deny'` to the CHECK constraint. No data migration needed.

## DB Migration

```sql
ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_page_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_page_check
  CHECK (page IN ('lessons', 'exercises', 'summaries', 'market', 'market_deny'));
```

RLS policies are unchanged — they already cover any value of `page`.

## Market Access Logic (updated)

Priority order in `/app/(student)/market/page.tsx`:

1. Row `(user_id, 'market_deny')` exists → **blocked** (overrides everything)
2. Row `(user_id, 'market')` exists → **explicitly granted** (early access)
3. `allLessonsCompleted` → **auto-open**
4. Otherwise → **locked**

## Server Action: `toggleMarketPermissionAction`

File: `/app/admin/students/permissions/actions.ts` (add to existing file)

Input (zod): `{ user_id: uuid, action: 'grant' | 'revoke_grant' | 'deny' | 'revoke_deny' }`

| action | DB ops |
|--------|--------|
| `grant` | DELETE `market_deny` if exists → INSERT `market` |
| `revoke_grant` | DELETE `market` |
| `deny` | DELETE `market` if exists → INSERT `market_deny` |
| `revoke_deny` | DELETE `market_deny` |

Always `revalidatePath('/admin/students/[id]', 'page')` at the end.

## New Component: `MarketPermissionToggle`

File: `/app/admin/students/[id]/_components/market-permission-toggle.tsx`

Client component. Receives:
- `userId: string`
- `marketState: 'locked' | 'early_grant' | 'auto_open' | 'blocked'`

| marketState | Display | Button |
|-------------|---------|--------|
| `locked` | 🔒 "ממתין להשלמת שיעורים" | "פתח גישה מוקדמת" → `grant` |
| `early_grant` | 🔓 badge "פתוח ידנית" | "בטל גישה מוקדמת" → `revoke_grant` + "חסום" → `deny` |
| `auto_open` | ✓ "נפתח — השלים שיעורים" | "חסום גישה" → `deny` |
| `blocked` | 🔒 badge "חסום" | "הסר חסימה" → `revoke_deny` |

## Admin Page Changes

`/app/admin/students/[id]/page.tsx`:
1. Fetch `market` and `market_deny` rows for the student (alongside existing `deniedRows`)
2. Compute `marketState` from those rows + `allLessonsCompleted`
3. Render `<MarketPermissionToggle>` inside the existing "הרשאות גישה לעמודים" card, after the three existing toggles

## Files to Create / Modify

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_market_deny.sql` | Add `market_deny` to CHECK constraint |
| `app/admin/students/permissions/actions.ts` | Add `toggleMarketPermissionAction` |
| `app/admin/students/[id]/_components/market-permission-toggle.tsx` | New component |
| `app/admin/students/[id]/page.tsx` | Fetch market rows, compute state, render toggle |
| `app/(student)/market/page.tsx` | Update `isGranted` / add `isDenied` check |

## Out of Scope

- Per-lesson summaries permission (summaries toggle covers all summaries as a group — unchanged)
- Any changes to the lesson unlock system (unchanged)
- Exercises remain a section-level toggle (unchanged)
