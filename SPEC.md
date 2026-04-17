# SPEC.md — Hagai Gilis Trading Education PWA

Feature breakdown for MVP. This spec is scope, not implementation. `CLAUDE.md` is the how; this file is the what.

---

## Roles

| Role | Who | Capabilities |
|---|---|---|
| `admin` | Hagai Gilis (single user) | Create students, CRUD modules/lessons/exercises, view all progress, delete accounts |
| `student` | Invited learners | Watch lessons, take exercises, track own progress, update own profile |

Role is stored in `profiles.role` (`role_enum`). Never trusted from client — verified server-side via `profiles` subquery on every admin action.

---

## Onboarding & access

**Admin-invite only** — no public `/signup`.

Flow:
1. Admin opens **Students → הוסף תלמיד** (add student) page.
2. Admin enters the student's email + full name + optional welcome note.
3. System creates an `auth.users` row via `admin.createUser()` with a one-time invite link (Supabase magic-link invite).
4. System inserts a `profiles` row with `role = 'student'` (via `handle_new_user` trigger — single source of truth, not a race between client and server).
5. Student receives Hebrew email: "חגי גיליס הזמין אותך ללמוד מסחר" with invite link.
6. Student clicks link → lands on **/invite/set-password** → sets password → redirected to `/` (student home).
7. Thereafter: normal `/login` with email + password. `/forgot-password` sends reset email.

**Final choice of temp-password vs magic-link invite** is deferred to Step 3. Both flows work with the schema above.

Admin bootstrapping: the first admin is promoted manually via SQL (`UPDATE profiles SET role = 'admin' WHERE email = 'hagai@...'`) before the app ships. No self-serve admin promotion ever.

---

## Course system

### Data shape (conceptual)
- **modules** — top-level groupings (e.g. "יסודות ניתוח טכני"). Fields: `id`, `title`, `description`, `order_index`, `created_at`.
- **lessons** — belong to a module. Fields: `id`, `module_id`, `title`, `description`, `video_url` (Bunny iframe URL, nullable), `order_index`, `created_at`.
- **lesson_progress** — per `(user_id, lesson_id)`. Fields: `user_id`, `lesson_id`, `completed_at` (nullable), `last_position_seconds`, `updated_at`.

### Access pattern
- Students: SELECT all `modules` + `lessons`; SELECT/UPSERT their own `lesson_progress`.
- Admin: full CRUD on `modules`, `lessons`; SELECT all `lesson_progress`.

### Admin UX
- Modules list → create/edit/reorder modules (drag handle).
- Inside a module → lessons list → create/edit/reorder/delete lesson.
- Lesson form: title, description (textarea), video URL input (paste Bunny iframe URL — stubbed until Bunny is wired).

### Student UX
- `/` home → "המשך ללמוד" resume card (last incomplete lesson) + modules grid.
- `/modules/[id]` → module detail with lesson list + completion badges.
- `/lessons/[id]` → video player (top), lesson description, exercises (below), "סמן כהושלם" button.
- Progress tracked implicitly from `last_position_seconds` updates + explicit completion button.

---

## Exercise system

The signature feature. Students read candlestick charts and identify patterns / support / resistance / entry zones by tapping on a chart.

### Data shape (conceptual)
- **exercises** — belong to a lesson (optional module-level later). Fields: `id`, `lesson_id` (nullable), `title`, `prompt`, `chart_config` (JSONB — OHLC array + metadata), `answer_config` (JSONB — correct zones/candles), `order_index`, `created_at`.
- **exercise_attempts** — per attempt. Fields: `id`, `user_id`, `exercise_id`, `answer` (JSONB — what the student tapped), `is_correct` (boolean), `created_at`.

### Access pattern
- Students: SELECT all `exercises`; INSERT their own `exercise_attempts`; SELECT their own attempts.
- Admin: full CRUD on `exercises`; SELECT all `exercise_attempts` (aggregate view).

### Chart rendering
- **Pure SVG, no charting library.** Custom component (`CandlestickChart`) that maps OHLC → SVG rects + wicks.
- Generous tap targets for mobile (min 44×44px hitbox on each candle).
- Immediate feedback on tap: green flash on correct zone, red flash on incorrect, explanatory note after answer.

### Admin exercise builder
- Paste OHLC data as JSON or simple CSV (phase 1 — simplest path).
- Visual preview rendered live.
- Click to mark correct zone(s) / candle(s).
- Prompt text in Hebrew.

### Admin analytics
- Per-exercise: number of attempts, % correct, list of students who got it wrong.
- Per-student: all attempts with correctness.

---

## PWA layer (Step 6)

- **manifest.json** with Hebrew app name ("חגי גיליס — מסחר"), short name, icons (192, 512), `display: standalone`, `dir: rtl`, `lang: he`, orange theme color.
- **Service worker** via Serwist — cache app shell + lesson metadata. Videos are not precached (too large, Bunny handles delivery).
- **Install prompt** — custom banner on mobile viewport only, dismissable, respects `beforeinstallprompt`. Hidden on iOS Safari (no support); instead show iOS-specific "Add to Home Screen" hint.
- **Offline fallback** page in Hebrew.
- Real device test on iPhone + Android before declaring done.

---

## Admin surface

Routes under `/admin/*`, protected by middleware (redirect to `/login` if not authed, redirect to `/` if not admin).

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: student count, recent signups, completion stats |
| `/admin/students` | Roster: list all students, search, "הוסף תלמיד" button |
| `/admin/students/[id]` | Drill-down: progress per lesson, exercise attempts |
| `/admin/modules` | Module CRUD |
| `/admin/modules/[id]/lessons` | Lesson CRUD inside a module |
| `/admin/exercises` | Exercise builder + preview |
| `/admin/exercises/[id]/analytics` | Per-exercise analytics |

---

## Student surface

| Route | Purpose |
|---|---|
| `/` | Home: continue lesson + modules grid |
| `/modules/[id]` | Module detail with lesson list |
| `/lessons/[id]` | Video + exercises + description + mark-complete |
| `/account` | Edit full name, change password, logout |

---

## Notifications, emails, transactional

- Invite email (admin → student) — Supabase-managed, Hebrew template.
- Password reset email — Supabase-managed, Hebrew template.
- No in-app notifications in MVP.

---

## Non-goals (explicitly out of MVP)

- Payments / subscriptions
- Public signup or landing marketing page
- Certificates / completion awards
- Social features (comments, sharing, leaderboard)
- Live chat or support widget
- Native mobile app (PWA only)
- Multi-language (Hebrew only, but `lang="he"` makes i18n cheap later)
- Light theme (dark only for MVP)
- Email digests / reminders
- Video downloads / offline video playback

---

## Success criteria (MVP ship)

1. Hagai can log in as admin and create 10+ students.
2. Hagai can create 3+ modules with 5+ lessons each and at least 10 exercises.
3. A student can: accept an invite, set a password, log in, watch a lesson, complete an exercise, see their progress.
4. The app installs as a PWA on a real iPhone and a real Android device.
5. All RLS policies audited by supabase-rls-checker with no Critical/High findings.
6. All UI audited by rtl-auditor with no Critical/High findings.
7. Lighthouse PWA score ≥ 90 on mobile.
