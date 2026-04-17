# CLAUDE.md — Hagai Gilis Trading Education PWA

This file is the contract that every agent — main thread and subagents alike — follows when working in this repo. Read it before making any change. It supersedes generic defaults; user messages supersede this file.

---

## Project context

- **Product**: Hebrew-RTL Progressive Web App for Israeli trading coach **Hagai Gilis** (חגי גיליס). Students watch lessons, complete chart-reading exercises, and track progress. Hagai is the sole admin; students are invited.
- **Audience**: Hebrew speakers, mobile-first (Android + iPhone), also works on desktop.
- **Deployment target**: Vercel (web) + Supabase (hosted).
- **Status**: Early foundation. See `SPEC.md` for features, `/supabase/migrations/` for schema truth.

## Tech stack (locked — no substitutions without approval)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (no Pages Router). Originally scoped to 15; bumped to 16.2 on scaffold since it was the latest stable in April 2026 and the App Router patterns are identical. |
| Runtime | React 19.2 |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS + shadcn/ui |
| Fonts | Heebo (headings 400/700/900) + Assistant (body 400/600), via `next/font/google` |
| DB + Auth | Supabase (Postgres, Auth, RLS) — not Firebase, not Prisma |
| Forms | react-hook-form + zod, via shadcn Form primitive |
| Video host | Bunny.net Stream (deferred — player stubbed until credentials arrive) |
| PWA | Serwist (added in Step 6) |
| Package manager | **pnpm** (never `npm`, never `yarn`) |

## Architecture rules

1. **Server Components by default.** Only add `"use client"` when you need hooks, browser APIs, or event handlers.
2. **Async request APIs**: in Next 16, `cookies()`, `headers()`, and `params` are async — always `await` them (see `lib/supabase/server.ts` for the pattern).
3. **Data fetching in Server Components** — never `useEffect` for initial loads.
4. **Mutations via Server Actions** in `/app/**/actions.ts` with `"use server"`. No API routes unless absolutely required (webhooks, third-party callbacks).
5. **Supabase queries are typed** from generated types (`lib/types/database.ts`). Never hand-type query results.
6. **Two clients, strict separation:**
   - `lib/supabase/server.ts` → `createServerClient` + cookies. Use in Server Components, Server Actions, route handlers.
   - `lib/supabase/client.ts` → `createBrowserClient`. Use only in Client Components that genuinely need live browser queries.
7. **Middleware** refreshes the Supabase session cookie on every request (`middleware.ts`).

## Coding conventions

1. No `any`. If genuinely unknown, use `unknown` and narrow.
2. Tailwind utilities only. No inline `style={}`, no CSS modules, no CSS-in-JS.
3. Components under 200 lines — split when bigger.
4. Component names: `PascalCase`. File names: `kebab-case.tsx` (e.g. `lesson-card.tsx` exporting `LessonCard`).
5. Import order: React → Next → external libs → `@/` imports → relative imports.
6. Self-documenting code. Comments only for non-obvious business logic — never explain *what*, only *why*.
7. Every form: shadcn `Form` + `react-hook-form` + `zod` schema.
8. Server Action return shape: `{ success: true, data: T } | { success: false, error: string }`. Don't throw to the client.
9. Always `revalidatePath()` after a Server Action mutation.

## Security rules (non-negotiable)

1. **Every table has RLS enabled.** No exceptions — `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` in every migration that creates a table.
2. **Explicit policies** for each operation the app performs (SELECT / INSERT / UPDATE / DELETE). Missing policy = blocked operation.
3. **Admin checks use a subquery against `profiles`**, never JWT claims:
   ```sql
   EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
   ```
4. **Student-owned rows**: constraint `user_id = auth.uid()` on SELECT/UPDATE/DELETE.
5. **`service_role` key never in client code.** Server-side only (Server Actions, route handlers, middleware). Grep will catch you.
6. **Validate all inputs** in Server Actions with zod before touching the DB.
7. **Never trust `role` from the client** — always re-query `profiles.role` server-side before granting admin access.

## Hebrew / RTL rules

1. `<html dir="rtl" lang="he">` in `app/layout.tsx`. Never set `dir="ltr"` on the root.
2. All user-facing strings in Hebrew. Error messages, button labels, placeholders, toasts — all Hebrew.
3. Use **logical CSS properties / Tailwind logical utilities** — not physical ones:
   | Use | Not |
   |---|---|
   | `ms-*` / `me-*` | `ml-*` / `mr-*` |
   | `ps-*` / `pe-*` | `pl-*` / `pr-*` |
   | `start-*` / `end-*` | `left-*` / `right-*` |
   | `text-start` / `text-end` | `text-left` / `text-right` |
   | `border-s-*` / `border-e-*` | `border-l-*` / `border-r-*` |
4. `dir="ltr"` is allowed (and required) on inputs of these types only: `email`, `password`, `url`, `tel`, `number`. Hebrew text inputs default to `rtl` or `auto`.
5. Directional icons (back arrow, chevron-next, breadcrumb) flip with `rtl:rotate-180` or `rtl:scale-x-[-1]`. Non-directional icons (logos, play, settings, hamburger) do not.
6. Israeli date format `DD/MM/YYYY`. Currency `₪X` or `X ₪`. Numbers in Western digits (not Hebrew numerals).

## Design system

- **Theme**: dark primary, warm, professional. Dark backgrounds, high contrast.
- **Primary color**: `#f97316` (orange-500).
- **Border radius**: `14–16px` on cards (`rounded-xl`).
- **Spacing**: generous whitespace. Mobile tap targets min 44×44px.
- **Never**: Inter font, purple gradients on white, generic "AI dashboard" aesthetic.

## Forbidden

- ❌ Installing packages outside the stack without asking first
- ❌ `npm` or `yarn` (use `pnpm`)
- ❌ Adding features not asked for
- ❌ Fake/demo content — use real Hebrew placeholder text only
- ❌ Fake student data seeded without explicit approval
- ❌ Creating tables without RLS
- ❌ `localStorage` / `sessionStorage` (store state in Supabase)
- ❌ `README.md` until the app works end-to-end
- ❌ Comments that describe *what* code does

## Do

- ✅ Ask before architectural decisions
- ✅ Commit frequently with Hebrew+English commit messages (e.g. `feat(auth): add login page | הוספת מסך התחברות`)
- ✅ Test on mobile viewport (375px) throughout development
- ✅ Regenerate Supabase types after every schema change: `pnpm run db:types`

---

## Subagent usage rules

Five specialized subagents live in `.claude/agents/`. Use them aggressively — Haiku auditors are ~15× cheaper than doing the same work in the main thread.

### backend-builder (Sonnet)
**Use for**: any database schema change, new RLS policy, new Server Action, auth flow change, Bunny.net integration.
**Hands it off**: main thread reads the report, decides next step.
**Do not use for**: UI, components, page layout.

### frontend-builder (Sonnet)
**Use for**: any new page, component, layout, form, or UI change.
**Do not use for**: schema, RLS, Server Actions that perform mutations (those belong to backend-builder; frontend-builder may *call* them from UI).

### code-reviewer (Haiku, read-only)
**Run after**: any builder completes, before committing. Catches security leaks, `any`, convention violations, over-engineering.
**Cadence**: every time a builder reports back.

### rtl-auditor (Haiku, read-only)
**Run after**: any UI change. Catches LTR-biased CSS, unflipped directional icons, English strings, `dir="ltr"` misuse.
**Cadence**: every time frontend-builder completes UI work.

### supabase-rls-checker (Haiku, read-only)
**Run after**: any migration or policy change. Verifies RLS enabled on every table, policies match intended access, admin checks use `profiles` subquery.
**Cadence**: every backend-builder migration.

### Skip subagents when
- Single-file change under 20 lines
- Debugging that needs the main thread's full context
- Architectural discussion with the user

### Parallel dispatch
After any change that touches both UI and schema, run the three read-only auditors **in a single message with parallel tool calls**. They don't interfere with each other.

---

## Working workflow (7 steps)

1. **Planning** — Opus + main thread, writes `CLAUDE.md` + `SPEC.md`, gets user approval.
2. **Foundation** — backend-builder scaffolds Next.js + Supabase + profiles; frontend-builder sets up shadcn + Hebrew RTL shell. Then: rls-checker + code-reviewer.
3. **Auth** — admin-invite flow (no public signup), login, forgot-password, protected layout. rtl-auditor + code-reviewer.
4. **Course system** — modules, lessons, progress. UI: admin upload, student browsing, video player, progress. Full auditor sweep.
5. **Exercise system** — candlestick chart (pure SVG, no chart lib), tap handlers, feedback UI, admin analytics. Full auditor sweep.
6. **PWA layer** — manifest, Serwist service worker, install prompt. Real device test.
7. **Polish** — loading states, error boundaries, empty states, mobile testing. Full auditor sweep.

Do not skip steps. Do not jump ahead.

---

## Quick reference

- Schema truth: `/supabase/migrations/` (ordered SQL files)
- Types truth: `lib/types/database.ts` (generated — never hand-edit)
- Env vars: `.env.local` (copy from `.env.local.example`; never commit)
- Test viewport: 375px (iPhone SE) mobile-first, then scale up
