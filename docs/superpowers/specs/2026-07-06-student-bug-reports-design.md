# Student Bug Reports — Design

Date: 2026-07-06
Status: Approved

## Goal

Let students report bugs from inside the app, and give the admin (Hagai) a place to
read those reports so problems can be debugged. Read-only for the admin plus the
ability to delete a report. No status tracking, no screenshots, no student↔admin thread.

## Data model

New migration `supabase/migrations/<ts>_bug_reports.sql`:

```sql
create table public.bug_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null check (category in ('lessons','exercises','summaries','market','other')),
  description  text not null,
  page_url     text,   -- auto-captured: page the student came from (document.referrer)
  user_agent   text,   -- auto-captured: device/browser string
  created_at   timestamptz not null default now()
);
create index bug_reports_created_idx on public.bug_reports (created_at desc);
alter table public.bug_reports enable row level security;
```

RLS (follows repo conventions — student owns rows, admin via `profiles` subquery):

- `bug_reports_insert_own` — INSERT, `with check (user_id = auth.uid())`
- `bug_reports_select_own` — SELECT, `using (user_id = auth.uid())`
- `bug_reports_select_admin` — SELECT, admin subquery
- `bug_reports_delete_admin` — DELETE, admin subquery

## Student side

- Route: `app/(student)/report/page.tsx` — Server Component shell rendering a client form.
- Form (`_components/report-form.tsx`, `"use client"`): shadcn `Form` + react-hook-form + zod.
  - `category` — Select with Hebrew labels: שיעורים / תרגילים / סיכומים / מניות / אחר.
  - `description` — Textarea (required, min length), Hebrew RTL.
  - Hidden auto-captured `page_url = document.referrer` and `user_agent = navigator.userAgent`.
- Server Action `app/(student)/report/actions.ts` → `submitBugReportAction`:
  - `"use server"`, zod-validate (category enum, description non-empty), insert with
    `user_id = auth.uid()`, `revalidatePath`, return `{ success: true } | { success: false, error }`.
  - Hebrew success toast, reset form.
- Nav: add **"דיווח על תקלה"** (Bug icon) to the student header nav (`app/(student)/layout.tsx`)
  and the bottom tab bar (`app/(student)/_components/bottom-tab-bar.tsx`).

## Admin side

- Route: `app/admin/reports/page.tsx` — Server Component. Fetch all reports newest-first,
  join `profiles` for reporter `full_name` + `email`.
- Render a list; each item shows reporter name/email, category badge, description,
  page/device context, date (DD/MM/YYYY), and a delete button.
- Server Action `app/admin/reports/actions.ts` → `deleteBugReportAction`:
  re-check admin role server-side, delete by id, `revalidatePath`.
- Nav: add **"דיווחי תקלות"** (Bug icon) to `app/admin/_components/admin-nav.tsx`.

## Types

Apply migration to remote Supabase (via MCP), then `pnpm run db:types` to regenerate
`lib/types/database.ts`. Use generated types for queries.

## Out of scope (YAGNI)

- Status workflow (new/in-progress/resolved)
- Screenshot / file attachments
- Admin replies / two-way thread
- Email notifications

## Rollout

Migration (MCP) → regen types → build → auditors (code-reviewer, rtl-auditor,
supabase-rls-checker) → commit → push to `main` (Vercel auto-deploys).
