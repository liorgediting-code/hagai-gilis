# Course & Exercise System Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two-wave rewrite of course/exercise system: topics grouping, YouTube embeds, level-based exercise progression, WhatsApp card, market posts page, and navigation updates.

**Architecture:** Wave 1 lays DB schema + admin tooling; Wave 2 adds the student-facing exercise flow and market page. Each task is independently deployable.

**Tech Stack:** Next.js 16 App Router, Supabase/Postgres, TypeScript strict, Tailwind, shadcn/ui, pnpm, Server Actions, Server Components.

---

## Wave 1: Foundation

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260510000000_exercise_level_and_quiz.sql`

- [ ] **Step 1: Write migration file**

```sql
-- supabase/migrations/20260510000000_exercise_level_and_quiz.sql

-- lessons: pass threshold per lesson
ALTER TABLE public.lessons ADD COLUMN pass_threshold int NOT NULL DEFAULT 70;

-- exercises: difficulty level
ALTER TABLE public.exercises ADD COLUMN level int NOT NULL DEFAULT 1
  CHECK (level IN (1, 2, 3));
CREATE INDEX exercises_lesson_level_idx ON public.exercises (lesson_id, level);

-- exercise_submissions: grading fields
ALTER TABLE public.exercise_submissions ADD COLUMN passed boolean;
ALTER TABLE public.exercise_submissions ADD COLUMN score_pct int; -- 0-100, null for legacy

-- lesson_unlocks: admin manual overrides
CREATE TABLE public.lesson_unlocks (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  unlocked_by  uuid REFERENCES auth.users(id),
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.lesson_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_unlocks_select_own" ON public.lesson_unlocks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "lesson_unlocks_select_admin" ON public.lesson_unlocks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "lesson_unlocks_insert_admin" ON public.lesson_unlocks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "lesson_unlocks_delete_admin" ON public.lesson_unlocks
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- market_posts
CREATE TABLE public.market_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  image_url  text,
  author_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.market_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_posts_select_authenticated" ON public.market_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "market_posts_insert_admin" ON public.market_posts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "market_posts_update_admin" ON public.market_posts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "market_posts_delete_admin" ON public.market_posts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- user_permissions: add 'market' to allowed pages
ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_page_check;
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_page_check
  CHECK (page IN ('lessons', 'exercises', 'summaries', 'market'));

-- Data migration: wrap single-question multiple_choice → quiz format
UPDATE public.exercises
SET content_json = jsonb_build_object(
  'type',              'multiple_choice',
  'candles',           content_json->'candles',
  'support_levels',    content_json->'support_levels',
  'resistance_levels', content_json->'resistance_levels',
  'timeframe',         content_json->>'timeframe',
  'questions', jsonb_build_array(
    jsonb_build_object(
      'question',             content_json->>'question',
      'options',              content_json->'options',
      'correct_option_index', (content_json->>'correct_option_index')::int,
      'explanation',          content_json->>'explanation'
    )
  )
)
WHERE content_json->>'type' = 'multiple_choice'
  AND content_json->'questions' IS NULL;
```

- [ ] **Step 2: Apply migration via Supabase CLI**

```bash
cd /Users/liorgabay/Documents/projects/hagai-app
npx supabase db push
```

Expected: migration applies without errors.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
pnpm run db:types
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510000000_exercise_level_and_quiz.sql lib/types/database.ts
git commit -m "feat(db): add level/pass_threshold/lesson_unlocks/market_posts | הוספת טבלאות ועמודות חדשות"
git push origin main
```

---

### Task 2: TypeScript Types Update

**Files:**
- Modify: `lib/types/course-types.ts`
- Modify: `lib/types/exercise-types.ts`
- Modify: `lib/auth/check-page-access.ts`

- [ ] **Step 1: Update course-types.ts**

Replace the entire file content:

```typescript
export type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  order_index: number;
  pass_threshold: number;
  created_at: string;
  updated_at: string;
};

export type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
  last_position_seconds: number;
  completed_at: string | null;
  updated_at: string;
};

export type LessonSummaryRow = {
  lesson_id: string;
  body_markdown: string;
  updated_at: string;
};

export type UserPermissionRow = {
  user_id: string;
  page: "lessons" | "exercises" | "summaries" | "market";
  created_at: string;
};

export type PageKey = "lessons" | "exercises" | "summaries" | "market";

export type ExerciseRow = {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  order_index: number;
  level: number;
  content_json: unknown | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseSubmissionRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  attempt_number: number;
  answer_data: unknown | null;
  passed: boolean | null;
  score_pct: number | null;
  submitted_at: string;
};

export type LessonUnlockRow = {
  user_id: string;
  lesson_id: string;
  unlocked_at: string;
  unlocked_by: string | null;
};

export type MarketPostRow = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  author_id: string;
  created_at: string;
};

export type CandleData = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CandleChartExercise = {
  type: "candle_chart_select";
  question: string;
  candles: CandleData[];
  resistance_level?: number;
  support_level?: number;
  correct_candle_index: number;
  explanation: string;
};
```

- [ ] **Step 2: Update exercise-types.ts** — new quiz format

Replace the types and Zod schemas in `lib/types/exercise-types.ts`:

```typescript
// lib/types/exercise-types.ts
import { z } from "zod";
import type { CandleData } from "@/lib/types/course-types";

export type PriceLine = {
  price: number;
  label?: string;
};

export type AcceptanceZone = {
  min_price: number;
  max_price: number;
  start_candle_index: number;
  end_candle_index: number;
};

export type ChartClickExercise = {
  type: "chart_click";
  question: string;
  candles: CandleData[];
  support_levels: PriceLine[];
  resistance_levels: PriceLine[];
  timeframe?: string;
  acceptance_zone: AcceptanceZone;
  explanation: string;
};

export type MultipleChoiceQuestion = {
  question: string;
  options: [string, string, string, string];
  correct_option_index: 0 | 1 | 2 | 3;
  explanation: string;
};

export type MultipleChoiceExercise = {
  type: "multiple_choice";
  candles: CandleData[];
  support_levels: PriceLine[];
  resistance_levels: PriceLine[];
  timeframe?: string;
  questions: MultipleChoiceQuestion[];
};

export type SanitizedChartClickExercise = Omit<ChartClickExercise, "acceptance_zone">;

export type SanitizedMultipleChoiceQuestion = Omit<MultipleChoiceQuestion, "correct_option_index" | "explanation">;
export type SanitizedMultipleChoiceExercise = Omit<MultipleChoiceExercise, "questions"> & {
  questions: SanitizedMultipleChoiceQuestion[];
};

export type ExerciseContent =
  | ChartClickExercise
  | MultipleChoiceExercise
  | { type: "candle_chart_select"; [key: string]: unknown };

export type SanitizedExerciseContent =
  | SanitizedChartClickExercise
  | SanitizedMultipleChoiceExercise
  | { type: "candle_chart_select"; [key: string]: unknown };

export type ChartClickAnswer = {
  clicked_price: number;
  clicked_candle_index: number;
};

export type MultipleChoiceAnswer = {
  selected_option_indices: (0 | 1 | 2 | 3)[];
};

export type ExerciseSubmitResult = {
  status: "idle" | "success" | "error";
  error?: string;
  passed?: boolean;
  score_pct?: number;
  level?: number;
  explanation?: string;
  question_results?: { correct: boolean; explanation: string; correct_option_index: 0 | 1 | 2 | 3 }[];
};

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const priceLineSchema = z.object({
  price: z.number(),
  label: z.string().optional(),
});

export const acceptanceZoneSchema = z.object({
  min_price: z.number(),
  max_price: z.number(),
  start_candle_index: z.number().int().min(0),
  end_candle_index: z.number().int().min(0),
}).refine(
  (zone) => zone.max_price >= zone.min_price,
  { message: "מחיר מקסימום חייב להיות גדול ממינימום", path: ["max_price"] },
).refine(
  (zone) => zone.end_candle_index >= zone.start_candle_index,
  { message: "נר סיום חייב להיות גדול מנר התחלה", path: ["end_candle_index"] },
);

export const candleDataSchema = z.object({
  date: z.string().min(1),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

export const chartClickSchema = z.object({
  type: z.literal("chart_click"),
  question: z.string().min(1, "שאלה נדרשת"),
  candles: z.array(candleDataSchema).min(3, "נדרשים לפחות 3 נרות"),
  support_levels: z.array(priceLineSchema),
  resistance_levels: z.array(priceLineSchema),
  timeframe: z.string().optional(),
  acceptance_zone: acceptanceZoneSchema,
  explanation: z.string().min(1, "הסבר נדרש"),
});

export const multipleChoiceQuestionSchema = z.object({
  question: z.string().min(1, "שאלה נדרשת"),
  options: z.tuple([
    z.string().min(1, "אפשרות א נדרשת"),
    z.string().min(1, "אפשרות ב נדרשת"),
    z.string().min(1, "אפשרות ג נדרשת"),
    z.string().min(1, "אפשרות ד נדרשת"),
  ]),
  correct_option_index: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string().min(1, "הסבר נדרש"),
});

export const multipleChoiceSchema = z.object({
  type: z.literal("multiple_choice"),
  candles: z.array(candleDataSchema).min(3, "נדרשים לפחות 3 נרות"),
  support_levels: z.array(priceLineSchema),
  resistance_levels: z.array(priceLineSchema),
  timeframe: z.string().optional(),
  questions: z.array(multipleChoiceQuestionSchema).min(1, "נדרשת לפחות שאלה אחת"),
});

export const exerciseContentSchema = z.discriminatedUnion("type", [
  chartClickSchema,
  multipleChoiceSchema,
]);
```

- [ ] **Step 3: Update check-page-access.ts** — add "market" to PageKey import (the type already includes it after step 1; no code change needed in the function itself since it just passes PageKey through)

Verify `lib/auth/check-page-access.ts` compiles — no change needed, `PageKey` import comes from course-types.ts.

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | head -50
```

Expected: TypeScript errors only about things not yet implemented (not about the types we just changed).

- [ ] **Step 5: Commit**

```bash
git add lib/types/course-types.ts lib/types/exercise-types.ts
git commit -m "feat(types): quiz format MC types + LessonUnlock + MarketPost | עדכון טיפוסים"
git push origin main
```

---

### Task 3: Admin UI Topics Rename + Nav Updates

**Files:**
- Modify: `app/admin/_components/admin-nav.tsx`
- Modify: `app/admin/modules/page.tsx`

- [ ] **Step 1: Update admin-nav.tsx** — rename label + add market link

In `app/admin/_components/admin-nav.tsx`, update the `navLinks` array:

```typescript
import { MenuIcon, XIcon, LayoutDashboardIcon, UsersIcon, FolderIcon, FileTextIcon, DumbbellIcon, TrendingUpIcon } from "lucide-react";

const navLinks = [
  { href: "/admin", label: "דשבורד", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/students", label: "תלמידים", icon: UsersIcon, exact: false },
  { href: "/admin/modules", label: "ניהול נושאים", icon: FolderIcon, exact: false },
  { href: "/admin/summaries", label: "סיכומים", icon: FileTextIcon, exact: false },
  { href: "/admin/exercises", label: "תרגולים", icon: DumbbellIcon, exact: false },
  { href: "/admin/market", label: "מניות", icon: TrendingUpIcon, exact: false },
];
```

- [ ] **Step 2: Update admin/modules/page.tsx** — rename Hebrew labels

Change `"ניהול מודולים"` → `"ניהול נושאים"`, `"הוסף מודול"` → `"הוסף נושא"`, `"מודולים ({list.length})"` → `"נושאים ({list.length})"`, `"עדיין אין מודולים. צור את המודול הראשון."` → `"עדיין אין נושאים. צור את הנושא הראשון."`.

- [ ] **Step 3: Commit**

```bash
git add app/admin/_components/admin-nav.tsx app/admin/modules/page.tsx
git commit -m "feat(admin): rename modules→נושאים UI + add market nav | שינוי תוויות"
git push origin main
```

---

### Task 4: YouTube Utility + Lesson Form + VideoPlayer

**Files:**
- Create: `lib/utils/youtube.ts`
- Modify: `app/admin/lessons/_components/lesson-form.tsx`
- Modify: `app/admin/lessons/actions.ts`
- Modify: `components/lesson/video-player.tsx`

- [ ] **Step 1: Create lib/utils/youtube.ts**

```typescript
// lib/utils/youtube.ts
export function parseYouTubeEmbedUrl(url: string): string {
  const trimmed = url.trim();
  // Already embed URL
  if (trimmed.includes("youtube.com/embed/")) return trimmed;
  // youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  // Return as-is if unrecognized (admin entered custom embed URL)
  return trimmed;
}
```

- [ ] **Step 2: Update lesson-form.tsx** — YouTube label + pass_threshold field

Replace the `video_url` section and add `pass_threshold`:

```typescript
// In the form, replace the video_url section:
<div className="space-y-2">
  <Label htmlFor="video_url">כתובת YouTube (Embed URL — אופציונלי)</Label>
  <textarea
    id="video_url"
    name="video_url"
    rows={2}
    dir="ltr"
    defaultValue={defaultValues?.video_url ?? ""}
    placeholder="https://www.youtube.com/embed/VIDEO_ID"
    className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
  />
  <p className="text-xs text-muted-foreground">
    השתמש בכתובת embed — לדוגמה: https://www.youtube.com/embed/VIDEO_ID
  </p>
</div>

// Add after order_index:
<div className="space-y-2">
  <Label htmlFor="pass_threshold">סף מעבר (%)</Label>
  <Input
    id="pass_threshold"
    name="pass_threshold"
    type="number"
    dir="ltr"
    min="0"
    max="100"
    required
    defaultValue={defaultValues?.pass_threshold ?? 70}
    className="max-w-32"
  />
  <p className="text-xs text-muted-foreground">ציון מינימלי למעבר תרגיל (0–100, ברירת מחדל 70)</p>
</div>
```

The `LessonFormProps` defaultValues type is `Partial<LessonRow>` — `pass_threshold` is already on `LessonRow` after Task 2.

- [ ] **Step 3: Update lessons/actions.ts** — add pass_threshold + parseYouTubeEmbedUrl

```typescript
import { parseYouTubeEmbedUrl } from "@/lib/utils/youtube";

const lessonSchema = z.object({
  module_id: z.string().uuid("מזהה מודול לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(2000, "תיאור ארוך מדי").optional(),
  video_url: z.string().url("כתובת URL לא תקינה").optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
  pass_threshold: z.coerce.number().int().min(0).max(100).default(70),
});
```

In `createLessonAction`, after parsing, wrap the URL:

```typescript
const videoUrl = parsed.data.video_url
  ? parseYouTubeEmbedUrl(parsed.data.video_url)
  : null;

// In insert:
{
  module_id: parsed.data.module_id,
  title: parsed.data.title,
  description: parsed.data.description ?? null,
  video_url: videoUrl,
  order_index: parsed.data.order_index,
  pass_threshold: parsed.data.pass_threshold,
}
```

Do the same for `updateLessonAction`.

Also add `pass_threshold: formData.get("pass_threshold")` to the parsed object in both actions.

- [ ] **Step 4: Update video-player.tsx** — add YouTube allow attributes

```typescript
<iframe
  src={videoUrl}
  className="w-full aspect-video"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
  allowFullScreen
  title="סרטון שיעור"
/>
```

- [ ] **Step 5: Commit**

```bash
git add lib/utils/youtube.ts app/admin/lessons/_components/lesson-form.tsx app/admin/lessons/actions.ts components/lesson/video-player.tsx
git commit -m "feat(lessons): YouTube embed utility + pass_threshold field | תמיכה ב-YouTube + סף מעבר"
git push origin main
```

---

### Task 5: Admin Exercise Wizard — Level Selector in Step 1

**Files:**
- Modify: `app/admin/exercises/_components/wizard-step-1-type.tsx`
- Modify: `app/admin/exercises/_components/exercise-wizard.tsx`

- [ ] **Step 1: Update WizardStep1Type** — add level selector

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  selected: "chart_click" | "multiple_choice" | null;
  level: 1 | 2 | 3;
  onSelect: (type: "chart_click" | "multiple_choice") => void;
  onLevelChange: (level: 1 | 2 | 3) => void;
  onNext: () => void;
}

export function WizardStep1Type({ selected, level, onSelect, onLevelChange, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 1 — סוג תרגיל</h2>
        <p className="mt-1 text-sm text-muted-foreground">בחר את סוג התרגיל ורמת הקושי</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={`cursor-pointer transition-colors ${selected === "chart_click" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
          onClick={() => onSelect("chart_click")}
        >
          <CardContent className="pt-6 pb-6 space-y-2">
            <div className="text-2xl">📍</div>
            <h3 className="font-semibold">לחיצה על גרף</h3>
            <p className="text-sm text-muted-foreground">
              הסטודנט לוחץ על נקודה בגרף. האדמין מגדיר אזור קבלה.
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${selected === "multiple_choice" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
          onClick={() => onSelect("multiple_choice")}
        >
          <CardContent className="pt-6 pb-6 space-y-2">
            <div className="text-2xl">🔤</div>
            <h3 className="font-semibold">שאלון (מבחן)</h3>
            <p className="text-sm text-muted-foreground">
              מספר שאלות אמריקאיות על גרף משותף. מוערך לפי % נכון.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">רמת קושי</p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLevelChange(l)}
              className={`min-h-11 min-w-11 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                level === l
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              רמה {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-start">
        <Button onClick={onNext} disabled={!selected} className="min-h-11">
          המשך לשלב 2
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add level state to ExerciseWizard**

In `exercise-wizard.tsx`, add:
```typescript
const [level, setLevel] = useState<1 | 2 | 3>((initial.level as 1 | 2 | 3) ?? 1);
```

Update the `WizardInitialData` interface to include `level?: number`.

Update the Step 1 render:
```typescript
{step === 0 && (
  <WizardStep1Type
    selected={exType}
    level={level}
    onSelect={setExType}
    onLevelChange={setLevel}
    onNext={() => setStep(1)}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/exercises/_components/wizard-step-1-type.tsx app/admin/exercises/_components/exercise-wizard.tsx
git commit -m "feat(wizard): add level selector to step 1 | בחירת רמה באשף"
git push origin main
```

---

### Task 6: Admin Exercise Wizard — Quiz Builder (Step 3 for MC)

**Files:**
- Create: `app/admin/exercises/_components/wizard-step-3-quiz.tsx`
- Modify: `app/admin/exercises/_components/exercise-wizard.tsx`

- [ ] **Step 1: Create wizard-step-3-quiz.tsx**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, MultipleChoiceQuestion } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  timeframe?: string;
  questions: MultipleChoiceQuestion[];
  onUpdate: (questions: MultipleChoiceQuestion[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const blankQuestion = (): MultipleChoiceQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correct_option_index: 0,
  explanation: "",
});

export function WizardStep3Quiz({
  candles, supportLevels, resistanceLevels, timeframe,
  questions, onUpdate, onNext, onBack,
}: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number>(questions.length === 0 ? 0 : questions.length - 1);

  function addQuestion() {
    const next = [...questions, blankQuestion()];
    onUpdate(next);
    setExpandedIdx(next.length - 1);
  }

  function removeQuestion(i: number) {
    const next = questions.filter((_, idx) => idx !== i);
    onUpdate(next);
    setExpandedIdx(Math.min(expandedIdx, next.length - 1));
  }

  function updateQuestion(i: number, patch: Partial<MultipleChoiceQuestion>) {
    const next = questions.map((q, idx) => idx === i ? { ...q, ...patch } : q);
    onUpdate(next);
  }

  function setOption(qi: number, oi: number, value: string) {
    const opts = [...questions[qi].options] as [string, string, string, string];
    opts[oi] = value;
    updateQuestion(qi, { options: opts });
  }

  const canProceed =
    questions.length >= 1 &&
    questions.every(
      (q) =>
        q.question.trim() &&
        q.options.every((o) => o.trim()) &&
        q.explanation.trim(),
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 3 — שאלות</h2>
        <p className="mt-1 text-sm text-muted-foreground">הגרף משותף לכל השאלות. הוסף שאלה אחת לפחות.</p>
      </div>

      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={candles}
            mode="view-only"
            supportLevels={supportLevels}
            resistanceLevels={resistanceLevels}
            timeframe={timeframe}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-border/50 bg-card">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
              onClick={() => setExpandedIdx(expandedIdx === qi ? -1 : qi)}
            >
              <span>שאלה {qi + 1}{q.question ? `: ${q.question.slice(0, 30)}${q.question.length > 30 ? "…" : ""}` : ""}</span>
              <span className="text-muted-foreground">{expandedIdx === qi ? "▲" : "▼"}</span>
            </button>

            {expandedIdx === qi && (
              <div className="space-y-4 border-t border-border/50 px-4 py-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">שאלה</label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="מה מראה הגרף?"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">אפשרויות (לחץ על האות לסימון כנכונה)</label>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-3 items-center">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qi, { correct_option_index: oi as 0 | 1 | 2 | 3 })}
                        className={`size-8 shrink-0 rounded-full text-sm font-bold transition-colors ${
                          q.correct_option_index === oi
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {OPTION_LABELS[oi]}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => setOption(qi, oi, e.target.value)}
                        placeholder={`אפשרות ${OPTION_LABELS[oi]}`}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">הסבר (לאחר מענה)</label>
                  <textarea
                    rows={2}
                    value={q.explanation}
                    onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="הסבר מדוע זו התשובה הנכונה..."
                  />
                </div>

                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qi)}
                    className="text-destructive hover:text-destructive min-h-9"
                  >
                    הסר שאלה
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addQuestion} className="min-h-11 w-full">
          + הוסף שאלה
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!canProceed} className="min-h-11">המשך לשלב 4</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update ExerciseWizard state + routing**

In `exercise-wizard.tsx`:

1. Remove `options` and `correctOptionIndex` state (they're now per-question).
2. Add `questions` state: `const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>(initial.questions ?? []);`
3. Add `MultipleChoiceQuestion` to imports from exercise-types.
4. Update step 2 rendering for MC: replace `WizardStep3Options` with `WizardStep3Quiz`.
5. Import `WizardStep3Quiz`.

```typescript
import { WizardStep3Quiz } from "./wizard-step-3-quiz";
// Remove: import { WizardStep3Options } from "./wizard-step-3-options";

// Replace step 2 MC branch:
{step === 2 && exType === "multiple_choice" && (
  <WizardStep3Quiz
    candles={candles}
    supportLevels={supportLevels}
    resistanceLevels={resistanceLevels}
    timeframe={timeframe}
    questions={questions}
    onUpdate={setQuestions}
    onNext={() => setStep(3)}
    onBack={() => setStep(1)}
  />
)}
```

Also add `questions?: MultipleChoiceQuestion[]` to `WizardInitialData`.

- [ ] **Step 3: Commit**

```bash
git add app/admin/exercises/_components/wizard-step-3-quiz.tsx app/admin/exercises/_components/exercise-wizard.tsx
git commit -m "feat(wizard): quiz builder for multiple_choice step 3 | בניית שאלון"
git push origin main
```

---

### Task 7: Admin Exercise Wizard — buildContentJson + Step 4 + Actions

**Files:**
- Modify: `app/admin/exercises/_components/exercise-wizard.tsx`
- Modify: `app/admin/exercises/_components/wizard-step-4-question.tsx`
- Modify: `app/admin/exercises/actions.ts`

- [ ] **Step 1: Update buildContentJson in exercise-wizard.tsx**

```typescript
function buildContentJson(): string {
  if (exType === "chart_click") {
    return JSON.stringify({
      type: "chart_click",
      question,
      candles,
      support_levels: supportLevels,
      resistance_levels: resistanceLevels,
      acceptance_zone: zone!,
      explanation,
      ...(timeframe ? { timeframe } : {}),
    });
  } else {
    return JSON.stringify({
      type: "multiple_choice",
      candles,
      support_levels: supportLevels,
      resistance_levels: resistanceLevels,
      questions,
      ...(timeframe ? { timeframe } : {}),
    });
  }
}
```

Pass `level` and `exType` as props to `WizardStep4Question`:

```typescript
{step === 3 && (
  <WizardStep4Question
    title={title}
    question={question}
    explanation={explanation}
    lessonId={lessonId}
    orderIndex={orderIndex}
    level={level}
    exType={exType!}
    lessons={lessons}
    contentJson={buildContentJson()}
    editId={initial.editId}
    onUpdate={(data) => {
      setTitle(data.title);
      setQuestion(data.question);
      setExplanation(data.explanation);
      setLessonId(data.lessonId);
      setOrderIndex(data.orderIndex);
    }}
    onBack={() => setStep(2)}
  />
)}
```

- [ ] **Step 2: Update WizardStep4Question** — add level hidden input, hide MC question/explanation

```typescript
interface Props {
  title: string;
  question: string;
  explanation: string;
  lessonId: string;
  orderIndex: number;
  level: 1 | 2 | 3;
  exType: "chart_click" | "multiple_choice";
  lessons: LessonOption[];
  contentJson: string;
  editId?: string;
  onUpdate: (data: {
    title: string;
    question: string;
    explanation: string;
    lessonId: string;
    orderIndex: number;
  }) => void;
  onBack: () => void;
}
```

Inside the form, add the level hidden input:
```tsx
<input type="hidden" name="level" value={level} />
```

Conditionally show question/explanation only for chart_click:
```tsx
{exType === "chart_click" && (
  <>
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor="question">שאלה</label>
      <textarea id="question" required rows={3}
        defaultValue={question}
        onChange={(e) => onUpdate({ title, question: e.target.value, explanation, lessonId, orderIndex })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        name="__question_display" />
    </div>
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor="explanation">הסבר (לאחר מענה)</label>
      <textarea id="explanation" required rows={3}
        defaultValue={explanation}
        onChange={(e) => onUpdate({ title, question, explanation: e.target.value, lessonId, orderIndex })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        name="__explanation_display" />
    </div>
  </>
)}
```

- [ ] **Step 3: Update exercises/actions.ts** — add level to schema + DB ops, fix revalidatePaths

```typescript
const exerciseMetaSchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  level: z.coerce.number().int().min(1).max(3).default(1),
  description: z.string().max(2000).optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
  content_json: z.string().min(1, "תוכן תרגיל נדרש"),
});
```

In both `createExerciseAction` and `updateExerciseAction`, add `level: formData.get("level")` to the parse call, and include `level: parsed.data.level` in the insert/update object.

Remove the `revalidatePath("/exercises")` calls (old student route being deleted).

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/exercises/_components/exercise-wizard.tsx app/admin/exercises/_components/wizard-step-4-question.tsx app/admin/exercises/actions.ts
git commit -m "feat(wizard): level in exercise actions + quiz buildContentJson | אחסון רמה ותוכן שאלון"
git push origin main
```

---

### Task 8: Admin Student Page — Lesson Unlock Section

**Files:**
- Create: `app/admin/students/[id]/actions.ts`
- Modify: `app/admin/students/[id]/page.tsx`

- [ ] **Step 1: Create app/admin/students/[id]/actions.ts**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const unlockSchema = z.object({
  user_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
});

export async function unlockLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = unlockSchema.safeParse({
    user_id: formData.get("user_id"),
    lesson_id: formData.get("lesson_id"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("lesson_unlocks").upsert({
    user_id: parsed.data.user_id,
    lesson_id: parsed.data.lesson_id,
    unlocked_by: admin.id,
  }, { onConflict: "user_id,lesson_id" });

  if (error) return { status: "error", error: "שגיאה בפתיחת השיעור" };

  revalidatePath(`/admin/students/${parsed.data.user_id}`);
  return { status: "success" };
}

export async function lockLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = unlockSchema.safeParse({
    user_id: formData.get("user_id"),
    lesson_id: formData.get("lesson_id"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase
    .from("lesson_unlocks")
    .delete()
    .eq("user_id", parsed.data.user_id)
    .eq("lesson_id", parsed.data.lesson_id);

  if (error) return { status: "error", error: "שגיאה בנעילת השיעור" };

  revalidatePath(`/admin/students/${parsed.data.user_id}`);
  return { status: "success" };
}
```

Note: `requireAdmin()` currently returns `void`. Update the call to get the admin user — check `lib/auth/require-admin.ts`. If it only returns void, use `requireUser()` separately or adjust. The admin check is already enforced by `requireAdmin()`.

Actually, since `requireAdmin()` likely just throws/redirects without returning user, replace `admin.id` with a separate `requireUser()` call for the `unlocked_by` field:

```typescript
import { requireUser } from "@/lib/auth/require-user";

export async function unlockLessonAction(...) {
  await requireAdmin();
  const adminUser = await requireUser();
  // ... use adminUser.id as unlocked_by
}
```

- [ ] **Step 2: Create LessonUnlockControls client component**

Create `app/admin/students/[id]/_components/lesson-unlock-controls.tsx`:

```typescript
"use client";

import { useActionState } from "react";
import { unlockLessonAction, lockLessonAction } from "../actions";
import type { ActionState } from "@/app/(auth)/actions";

interface Props {
  userId: string;
  lessonId: string;
  lockStatus: "auto" | "manual" | "locked";
}

const initial: ActionState = { status: "idle" };

export function LessonUnlockControls({ userId, lessonId, lockStatus }: Props) {
  const [unlockState, unlockAction] = useActionState(unlockLessonAction, initial);
  const [lockState, lockAction] = useActionState(lockLessonAction, initial);

  if (lockStatus === "locked") {
    return (
      <form action={unlockAction}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 min-h-9"
        >
          פתח שיעור
        </button>
        {unlockState.status === "error" && (
          <span className="text-xs text-destructive ms-2">{unlockState.error}</span>
        )}
      </form>
    );
  }

  if (lockStatus === "manual") {
    return (
      <form action={lockAction}>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="lesson_id" value={lessonId} />
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground min-h-9"
        >
          נעל
        </button>
        {lockState.status === "error" && (
          <span className="text-xs text-destructive ms-2">{lockState.error}</span>
        )}
      </form>
    );
  }

  return <span className="text-xs text-muted-foreground">אוטומטי</span>;
}
```

- [ ] **Step 3: Add lesson unlock section to admin/students/[id]/page.tsx**

After the progress card, add:

```typescript
// Import at top
import { LessonUnlockControls } from "./_components/lesson-unlock-controls";
import type { LessonUnlockRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

// In the data fetching (parallel with existing queries):
const [{ data: unlockRows }, { data: passedL3Subs }] = await Promise.all([
  db.from("lesson_unlocks").select("lesson_id").eq("user_id", id) as unknown as Promise<{ data: LessonUnlockRow[] | null }>,
  db.from("exercise_submissions")
    .select("exercise_id, passed")
    .eq("user_id", id)
    .eq("passed", true) as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "exercise_id" | "passed">[] | null }>,
]);

// Fetch exercises with level to know which are L3
const { data: l3Exercises } = await db.from("exercises").select("id, lesson_id, level").eq("level", 3) as unknown as Promise<{ data: { id: string; lesson_id: string; level: number }[] | null }>;

const manualUnlockSet = new Set((unlockRows ?? []).map((r) => r.lesson_id));
const passedL3ExerciseIds = new Set(
  (passedL3Subs ?? []).filter(s => s.passed).map(s => s.exercise_id)
);
const lessonsWithPassedL3 = new Set(
  (l3Exercises ?? []).filter(e => passedL3ExerciseIds.has(e.id)).map(e => e.lesson_id)
);

// Helper to compute lock status
function getLockStatus(lesson: { id: string; order_index: number }, allLessons: { id: string; order_index: number }[]): "auto" | "manual" | "locked" {
  if (lesson.order_index === 0) return "auto";
  if (manualUnlockSet.has(lesson.id)) return "manual";
  const prev = allLessons.find(l => l.order_index === lesson.order_index - 1);
  if (prev && lessonsWithPassedL3.has(prev.id)) return "auto";
  return "locked";
}
```

Add a "גישה לשיעורים" card section:

```tsx
<Card>
  <CardHeader className="border-b border-border/50 pb-4">
    <CardTitle className="text-base font-semibold">גישה לשיעורים</CardTitle>
  </CardHeader>
  <CardContent className="p-0">
    <ul className="divide-y divide-border/30">
      {(lessons ?? []).map((lesson) => {
        const status = getLockStatus(lesson as { id: string; order_index: number }, (lessons ?? []) as { id: string; order_index: number }[]);
        return (
          <li key={lesson.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">{lesson.title}</span>
              {status === "locked" && <span className="text-xs text-muted-foreground">🔒</span>}
              {status === "auto" && <span className="text-xs text-primary">✓ פתוח</span>}
              {status === "manual" && <span className="text-xs text-amber-500">פתוח ידנית</span>}
            </div>
            <LessonUnlockControls userId={id} lessonId={lesson.id} lockStatus={status} />
          </li>
        );
      })}
    </ul>
  </CardContent>
</Card>
```

Note: `lessons` query in the page currently selects `id, title` only. Update it to also select `order_index`:

```typescript
const { data: lessons } = (await db
  .from("lessons")
  .select("id, title, order_index")
  .order("order_index")) as { data: Pick<LessonRow, "id" | "title" | "order_index">[] | null; error: unknown };
```

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | grep -E "Error|error TS" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/students/[id]/actions.ts app/admin/students/[id]/_components/lesson-unlock-controls.tsx app/admin/students/[id]/page.tsx
git commit -m "feat(admin): lesson unlock/lock on student detail page | פתיחת שיעורים ידנית"
git push origin main
```

---

## Wave 2: Student Flow + Market Posts

---

### Task 9: Student Lessons Page — Grouped by Topic + Lock State

**Files:**
- Modify: `app/(student)/lessons/page.tsx`

- [ ] **Step 1: Rewrite lessons/page.tsx**

```typescript
import Link from "next/link";
import { BookOpenIcon, CheckCircleIcon, CircleIcon, LockIcon, PlayCircleIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, ModuleRow, LessonUnlockRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

export default async function LessonsPage() {
  await requirePageAccess("lessons");
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: modules },
    { data: lessons },
    { data: progress },
    { data: unlocks },
    { data: passedL3Subs },
    { data: l3Exercises },
  ] = await Promise.all([
    db.from("modules").select("*").order("order_index") as unknown as Promise<{ data: ModuleRow[] | null }>,
    db.from("lessons").select("*").order("order_index") as unknown as Promise<{ data: LessonRow[] | null }>,
    db.from("lesson_progress").select("*").eq("user_id", user.id) as unknown as Promise<{ data: LessonProgressRow[] | null }>,
    db.from("lesson_unlocks").select("lesson_id").eq("user_id", user.id) as unknown as Promise<{ data: Pick<LessonUnlockRow, "lesson_id">[] | null }>,
    db.from("exercise_submissions").select("exercise_id, passed").eq("user_id", user.id).eq("passed", true) as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "exercise_id" | "passed">[] | null }>,
    db.from("exercises").select("id, lesson_id").eq("level", 3) as unknown as Promise<{ data: { id: string; lesson_id: string }[] | null }>,
  ]);

  const allLessons = lessons ?? [];
  const completedIds = new Set(
    (progress ?? []).filter((p) => p.completed_at !== null).map((p) => p.lesson_id),
  );
  const manualUnlockIds = new Set((unlocks ?? []).map((u) => u.lesson_id));
  const passedL3ExIds = new Set((passedL3Subs ?? []).map((s) => s.exercise_id));
  const lessonsWithPassedL3 = new Set(
    (l3Exercises ?? []).filter((e) => passedL3ExIds.has(e.id)).map((e) => e.lesson_id),
  );

  function isUnlocked(lesson: LessonRow): boolean {
    if (lesson.order_index === 0) return true;
    if (manualUnlockIds.has(lesson.id)) return true;
    const prev = allLessons.find((l) => l.order_index === lesson.order_index - 1);
    return !!prev && lessonsWithPassedL3.has(prev.id);
  }

  const moduleList = modules ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpenIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">שיעורים</h1>
      </div>

      {moduleList.length === 0 && (
        <p className="text-sm text-muted-foreground">עדיין אין שיעורים. חזור בקרוב.</p>
      )}

      {moduleList.map((mod) => {
        const modLessons = allLessons.filter((l) => l.module_id === mod.id);
        const modCompleted = modLessons.filter((l) => completedIds.has(l.id)).length;

        return (
          <div key={mod.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-foreground">{mod.title}</h2>
              <span className="text-xs text-muted-foreground">{modCompleted} מתוך {modLessons.length} הושלמו</span>
            </div>

            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/30">
                  {modLessons.map((lesson) => {
                    const done = completedIds.has(lesson.id);
                    const unlocked = isUnlocked(lesson);

                    return (
                      <li key={lesson.id}>
                        {unlocked ? (
                          <Link
                            href={`/lessons/${lesson.id}`}
                            className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                          >
                            <span className="flex size-6 shrink-0 items-center justify-center">
                              {done ? (
                                <CheckCircleIcon className="size-5 text-primary" aria-hidden="true" />
                              ) : (
                                <CircleIcon className="size-5 text-muted-foreground/30" aria-hidden="true" />
                              )}
                            </span>
                            <p className={`flex-1 truncate text-sm font-medium ${done ? "text-muted-foreground" : "text-foreground"}`}>
                              {lesson.title}
                            </p>
                            {done && <span className="shrink-0 text-xs font-medium text-primary">הושלם</span>}
                          </Link>
                        ) : (
                          <div className="flex min-h-14 items-center gap-3 px-4 py-3 opacity-50">
                            <span className="flex size-6 shrink-0 items-center justify-center">
                              <LockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                            </span>
                            <p className="flex-1 truncate text-sm font-medium text-muted-foreground">{lesson.title}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(student)/lessons/page.tsx
git commit -m "feat(student): lessons grouped by topic + lock state | קיבוץ שיעורים לפי נושא + נעילה"
git push origin main
```

---

### Task 10: Student Lesson Page — Exercise Button + Retry Banner

**Files:**
- Modify: `app/(student)/lessons/[id]/page.tsx`

- [ ] **Step 1: Update lesson page**

Change the exercise link from `/exercises/${firstExercise.id}` to `/lessons/${id}/exercise`.

Add `searchParams` prop and show retry banner:

```typescript
interface LessonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retry?: string }>;
}

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  // ... existing code ...
  const { retry } = await searchParams;
  const showRetryBanner = retry === "true";
  
  // Remove the firstExercise query (no longer needed)
  // Instead check if lesson has any exercises:
  const { data: hasExercises } = (await db
    .from("exercises")
    .select("id")
    .eq("lesson_id", id)
    .limit(1)
    .maybeSingle() as unknown) as Promise<{ data: { id: string } | null; error: unknown }>;
```

In the JSX, add retry banner before the video:

```tsx
{showRetryBanner && (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
    <p className="font-medium text-amber-400">חזור לצפות בשיעור ואז לחץ על הכפתור למטה כדי להמשיך לרמה 2.</p>
  </div>
)}
```

Change exercise link:

```tsx
{hasExercises && (
  <Link
    href={showRetryBanner ? `/lessons/${id}/exercise` : `/lessons/${id}/exercise`}
    className={buttonVariants({ variant: showRetryBanner ? "default" : "outline", className: "min-h-11 gap-2" })}
  >
    <DumbbellIcon className="size-4" aria-hidden="true" />
    {showRetryBanner ? "המשך לתרגול רמה 2" : "התחל תרגול"}
  </Link>
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/(student)/lessons/[id]/page.tsx
git commit -m "feat(student): lesson page exercise button + retry banner | כפתור תרגול ובאנר חזרה"
git push origin main
```

---

### Task 11: Exercise Flow Page + Server Action

**Files:**
- Create: `app/(student)/lessons/[id]/exercise/page.tsx`
- Create: `app/(student)/lessons/[id]/exercise/actions.ts`

- [ ] **Step 1: Create exercise/actions.ts**

```typescript
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import type { ExerciseSubmitResult, ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";
import type { ExerciseRow, LessonRow } from "@/lib/types/course-types";

const submitSchema = z.object({
  exercise_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  answer_data: z.string().min(1),
});

export async function submitExerciseAttempt(
  _prev: ExerciseSubmitResult,
  formData: FormData,
): Promise<ExerciseSubmitResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const parsed = submitSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
    lesson_id: formData.get("lesson_id"),
    answer_data: formData.get("answer_data"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  let answerData: unknown;
  try { answerData = JSON.parse(parsed.data.answer_data); }
  catch { return { status: "error", error: "תשובה לא תקינה" }; }

  const { data: exercise } = (await db
    .from("exercises")
    .select("content_json, level, lesson_id")
    .eq("id", parsed.data.exercise_id)
    .single()) as { data: Pick<ExerciseRow, "content_json" | "level"> & { lesson_id: string } | null };

  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };

  const { data: lesson } = (await db
    .from("lessons")
    .select("pass_threshold")
    .eq("id", parsed.data.lesson_id)
    .single()) as { data: Pick<LessonRow, "pass_threshold"> | null };

  const passThreshold = lesson?.pass_threshold ?? 70;
  const content = exercise.content_json as ChartClickExercise | MultipleChoiceExercise | null;

  let passed = false;
  let score_pct = 0;
  let explanation: string | undefined;
  let question_results: ExerciseSubmitResult["question_results"];

  if (content?.type === "chart_click") {
    const answer = answerData as { clicked_price?: number; clicked_candle_index?: number };
    const zone = content.acceptance_zone;
    passed =
      typeof answer.clicked_price === "number" &&
      typeof answer.clicked_candle_index === "number" &&
      answer.clicked_price >= zone.min_price &&
      answer.clicked_price <= zone.max_price &&
      answer.clicked_candle_index >= zone.start_candle_index &&
      answer.clicked_candle_index <= zone.end_candle_index;
    score_pct = passed ? 100 : 0;
    explanation = content.explanation;
  } else if (content?.type === "multiple_choice") {
    const answer = answerData as { selected_option_indices?: number[] };
    const indices = answer.selected_option_indices ?? [];
    question_results = content.questions.map((q, i) => ({
      correct: indices[i] === q.correct_option_index,
      explanation: q.explanation,
      correct_option_index: q.correct_option_index,
    }));
    const correctCount = question_results.filter((r) => r.correct).length;
    score_pct = Math.round((correctCount / content.questions.length) * 100);
    passed = score_pct >= passThreshold;
  }

  // Get next attempt number
  const { data: existing } = (await db
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exercise_id)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null };

  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const { error } = await db.from("exercise_submissions").insert({
    user_id: user.id,
    exercise_id: parsed.data.exercise_id,
    attempt_number: nextAttempt,
    answer_data: answerData,
    passed,
    score_pct,
  });

  if (error) return { status: "error", error: "שגיאה בשמירת התשובה — נסה שנית" };

  return { status: "success", passed, score_pct, level: exercise.level, explanation, question_results };
}
```

- [ ] **Step 2: Create exercise/page.tsx — server routing logic**

```typescript
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import type { ExerciseRow, LessonRow, ExerciseSubmissionRow } from "@/lib/types/course-types";
import type { SanitizedExerciseContent, ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";
import { ExerciseFlow } from "./_components/exercise-flow";

interface Props { params: Promise<{ id: string }> }

function pickExercise(pool: ExerciseRow[], submissions: ExerciseSubmissionRow[]): ExerciseRow | null {
  if (pool.length === 0) return null;
  const passedIds = new Set(submissions.filter((s) => s.passed).map((s) => s.exercise_id));
  const candidates = pool.filter((e) => !passedIds.has(e.id));
  const pool2 = candidates.length > 0 ? candidates : pool;
  return pool2[Math.floor(Math.random() * pool2.length)];
}

function sanitize(content: ChartClickExercise | MultipleChoiceExercise): SanitizedExerciseContent {
  if (content.type === "chart_click") {
    const { acceptance_zone: _az, ...safe } = content;
    return safe;
  }
  return {
    ...content,
    questions: content.questions.map(({ correct_option_index: _c, explanation: _e, ...q }) => q),
  };
}

export default async function ExercisePage({ params }: Props) {
  await requirePageAccess("lessons");
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: lesson } = (await db
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single()) as { data: LessonRow | null };
  if (!lesson) notFound();

  const { data: exercises } = (await db
    .from("exercises")
    .select("*")
    .eq("lesson_id", id)
    .order("order_index")) as { data: ExerciseRow[] | null };

  const allExercises = exercises ?? [];
  const exerciseIds = allExercises.map((e) => e.id);

  const { data: subs } = exerciseIds.length > 0
    ? (await db
        .from("exercise_submissions")
        .select("exercise_id, passed, score_pct")
        .eq("user_id", user.id)
        .in("exercise_id", exerciseIds)) as { data: ExerciseSubmissionRow[] | null }
    : { data: [] };

  const submissions = subs ?? [];

  const byLevel = (lvl: number) => allExercises.filter((e) => e.level === lvl);
  const hasPassed = (lvl: number) =>
    submissions.some((s) => byLevel(lvl).some((e) => e.id === s.exercise_id) && s.passed);
  const hasFailed = (lvl: number) =>
    submissions.some((s) => byLevel(lvl).some((e) => e.id === s.exercise_id) && s.passed === false);

  // Completion state
  if (hasPassed(3)) {
    // Find next lesson
    const { data: siblings } = (await db
      .from("lessons")
      .select("id, order_index, title")
      .eq("module_id", lesson.module_id)
      .order("order_index")) as { data: Pick<LessonRow, "id" | "order_index" | "title">[] | null };
    const idx = (siblings ?? []).findIndex((s) => s.id === id);
    const nextLesson = idx >= 0 && idx < (siblings ?? []).length - 1 ? (siblings ?? [])[idx + 1] : null;

    return (
      <ExerciseFlow
        lesson={lesson}
        exercise={null}
        sanitizedContent={null}
        completionState={{ nextLessonId: nextLesson?.id ?? null, nextLessonTitle: nextLesson?.title ?? null }}
      />
    );
  }

  let targetLevel: 1 | 2 | 3 = 1;
  if (hasPassed(1) || hasPassed(2)) targetLevel = 3;
  else if (hasFailed(1)) targetLevel = 2;

  const pool = byLevel(targetLevel);
  const exercise = pickExercise(pool, submissions);

  if (!exercise) {
    // No exercises at this level — go back to lesson
    redirect(`/lessons/${id}`);
  }

  const content = exercise.content_json as ChartClickExercise | MultipleChoiceExercise;
  const sanitizedContent = sanitize(content);

  return (
    <ExerciseFlow
      lesson={lesson}
      exercise={exercise}
      sanitizedContent={sanitizedContent}
      completionState={null}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(student)/lessons/[id]/exercise/page.tsx app/(student)/lessons/[id]/exercise/actions.ts
git commit -m "feat(student): exercise flow page + submitExerciseAttempt action | תרגיל מבוסס שלבים"
git push origin main
```

---

### Task 12: Exercise Components — ExerciseFlow + ChartClick + Quiz

**Files:**
- Create: `app/(student)/lessons/[id]/exercise/_components/exercise-flow.tsx`
- Create: `app/(student)/lessons/[id]/exercise/_components/chart-click-exercise.tsx`
- Create: `app/(student)/lessons/[id]/exercise/_components/quiz-exercise.tsx`

- [ ] **Step 1: Create exercise-flow.tsx** — top-level client component

```typescript
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { submitExerciseAttempt } from "../actions";
import { ChartClickExercise as ChartClickComp } from "./chart-click-exercise";
import { QuizExercise } from "./quiz-exercise";
import { ResultCard } from "./result-card";
import { WhatsAppCard } from "./whatsapp-card";
import type { ExerciseSubmitResult, SanitizedExerciseContent } from "@/lib/types/exercise-types";
import type { ExerciseRow, LessonRow } from "@/lib/types/course-types";

interface Props {
  lesson: LessonRow;
  exercise: ExerciseRow | null;
  sanitizedContent: SanitizedExerciseContent | null;
  completionState: { nextLessonId: string | null; nextLessonTitle: string | null } | null;
}

const initial: ExerciseSubmitResult = { status: "idle" };

export function ExerciseFlow({ lesson, exercise, sanitizedContent, completionState }: Props) {
  const [result, formAction] = useActionState(submitExerciseAttempt, initial);
  const [answerData, setAnswerData] = useState<string>("");

  if (completionState) {
    return (
      <div className="space-y-6">
        <Breadcrumb lessonId={lesson.id} lessonTitle={lesson.title} />
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-8 text-center space-y-4">
          <p className="text-3xl">🎉</p>
          <h2 className="font-heading text-xl font-bold">מצוין! סיימת את כל שלבי התרגול</h2>
          <p className="text-sm text-muted-foreground">השיעור הבא נפתח עבורך</p>
          {completionState.nextLessonId ? (
            <Link
              href={`/lessons/${completionState.nextLessonId}`}
              className={buttonVariants({ className: "min-h-11 mt-2" })}
            >
              המשך לשיעור הבא: {completionState.nextLessonTitle}
            </Link>
          ) : (
            <Link href="/lessons" className={buttonVariants({ variant: "outline", className: "min-h-11 mt-2" })}>
              חזור לרשימת השיעורים
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!exercise || !sanitizedContent) return null;

  const level = exercise.level as 1 | 2 | 3;

  if (result.status === "success") {
    if (!result.passed && level === 2) {
      return (
        <div className="space-y-6">
          <Breadcrumb lessonId={lesson.id} lessonTitle={lesson.title} />
          <WhatsAppCard />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <Breadcrumb lessonId={lesson.id} lessonTitle={lesson.title} />
        <ResultCard
          passed={result.passed!}
          scorePct={result.score_pct}
          level={level}
          lessonId={lesson.id}
          explanation={result.explanation}
          questionResults={result.question_results}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb lessonId={lesson.id} lessonTitle={lesson.title} />
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
          רמה {level}
        </span>
      </div>

      <form action={formAction}>
        <input type="hidden" name="exercise_id" value={exercise.id} />
        <input type="hidden" name="lesson_id" value={lesson.id} />
        <input type="hidden" name="answer_data" value={answerData} />

        {sanitizedContent.type === "chart_click" && (
          <ChartClickComp content={sanitizedContent} onAnswer={setAnswerData} />
        )}
        {sanitizedContent.type === "multiple_choice" && (
          <QuizExercise content={sanitizedContent} onAnswer={setAnswerData} />
        )}
      </form>
    </div>
  );
}

function Breadcrumb({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  return (
    <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/lessons" className="hover:text-foreground transition-colors">שיעורים</Link>
      <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
      <Link href={`/lessons/${lessonId}`} className="hover:text-foreground transition-colors">{lessonTitle}</Link>
      <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
      <span className="text-foreground font-medium">תרגול</span>
    </nav>
  );
}
```

- [ ] **Step 2: Create chart-click-exercise.tsx**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { SanitizedChartClickExercise } from "@/lib/types/exercise-types";

interface Props {
  content: SanitizedChartClickExercise;
  onAnswer: (json: string) => void;
}

export function ChartClickExercise({ content, onAnswer }: Props) {
  const [clicked, setClicked] = useState<{ price: number; index: number } | null>(null);

  function handleClick(price: number, index: number) {
    setClicked({ price, index });
    onAnswer(JSON.stringify({ clicked_price: price, clicked_candle_index: index }));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{content.question}</p>
      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={content.candles}
            mode="student-click"
            supportLevels={content.support_levels}
            resistanceLevels={content.resistance_levels}
            timeframe={content.timeframe}
            onStudentClick={handleClick}
            studentClick={clicked ? { price: clicked.price, candleIndex: clicked.index } : undefined}
          />
        </CardContent>
      </Card>
      <Button
        type="submit"
        disabled={!clicked}
        className="min-h-11 w-full"
      >
        שלח תשובה
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create quiz-exercise.tsx**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { SanitizedMultipleChoiceExercise } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  content: SanitizedMultipleChoiceExercise;
  onAnswer: (json: string) => void;
}

export function QuizExercise({ content, onAnswer }: Props) {
  const [selections, setSelections] = useState<(0 | 1 | 2 | 3 | null)[]>(
    content.questions.map(() => null),
  );

  function select(qi: number, oi: 0 | 1 | 2 | 3) {
    const next = [...selections];
    next[qi] = oi;
    setSelections(next);
    onAnswer(JSON.stringify({ selected_option_indices: next.map((s) => s ?? 0) }));
  }

  const allAnswered = selections.every((s) => s !== null);

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={content.candles}
            mode="view-only"
            supportLevels={content.support_levels}
            resistanceLevels={content.resistance_levels}
            timeframe={content.timeframe}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {content.questions.map((q, qi) => (
          <div key={qi} className="space-y-3">
            <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => select(qi, oi as 0 | 1 | 2 | 3)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm text-start transition-colors ${
                    selections[qi] === oi
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-card hover:border-primary/50"
                  }`}
                >
                  <span className={`size-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${
                    selections[qi] === oi ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {OPTION_LABELS[oi]}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={!allAnswered} className="min-h-11 w-full">
        שלח תשובה
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(student)/lessons/[id]/exercise/_components/
git commit -m "feat(student): exercise flow + chart-click + quiz components | קומפוננטות תרגול"
git push origin main
```

---

### Task 13: Result Cards + WhatsApp Card

**Files:**
- Create: `app/(student)/lessons/[id]/exercise/_components/result-card.tsx`
- Create: `app/(student)/lessons/[id]/exercise/_components/whatsapp-card.tsx`

- [ ] **Step 1: Create result-card.tsx**

```typescript
"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ExerciseSubmitResult } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  passed: boolean;
  scorePct?: number;
  level: 1 | 2 | 3;
  lessonId: string;
  explanation?: string;
  questionResults?: ExerciseSubmitResult["question_results"];
}

export function ResultCard({ passed, scorePct, level, lessonId, explanation, questionResults }: Props) {
  const messages: Record<`${1 | 2 | 3}-${"pass" | "fail"}`, { title: string; body: string }> = {
    "1-pass": { title: "כל הכבוד! עברת לרמה הגבוהה", body: "עכשיו תנסה תרגיל קשה יותר." },
    "1-fail": { title: "לא עברת. חזור לשיעור ונסה שנית", body: "צפה בשיעור שוב ואז נסה תרגיל ברמה 2." },
    "2-pass": { title: "עברת! ממשיכים לרמה הגבוהה", body: "עכשיו תנסה תרגיל קשה יותר." },
    "2-fail": { title: "", body: "" }, // handled by WhatsAppCard
    "3-pass": { title: "מצוין! השיעור הבא נפתח עבורך", body: "לחץ להמשיך לשיעור הבא." },
    "3-fail": { title: "לא עברת. נסה שוב", body: "נסה תרגיל אחר ברמה 3." },
  };

  const key = `${level}-${passed ? "pass" : "fail"}` as keyof typeof messages;
  const msg = messages[key];

  return (
    <div className={`rounded-xl border px-6 py-6 space-y-4 ${passed ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{passed ? "✅" : "❌"}</span>
        <div>
          <h2 className="font-heading text-lg font-bold">{msg.title}</h2>
          {scorePct !== undefined && (
            <p className="text-sm text-muted-foreground">ציון: {scorePct}%</p>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{msg.body}</p>

      {explanation && (
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
          <p className="font-medium mb-1">הסבר:</p>
          <p className="text-muted-foreground">{explanation}</p>
        </div>
      )}

      {questionResults && questionResults.length > 0 && (
        <div className="space-y-3">
          {questionResults.map((qr, i) => (
            <div key={i} className={`rounded-lg px-4 py-3 text-sm ${qr.correct ? "bg-primary/5" : "bg-destructive/5"}`}>
              <p className="font-medium mb-1">
                שאלה {i + 1}: {qr.correct ? "✓ נכון" : `✗ לא נכון — תשובה נכונה: ${OPTION_LABELS[qr.correct_option_index]}`}
              </p>
              <p className="text-muted-foreground">{qr.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {passed && (level === 1 || level === 2) && (
          <Link href={`/lessons/${lessonId}/exercise`} className={buttonVariants({ className: "min-h-11" })}>
            המשך לרמה 3
          </Link>
        )}
        {passed && level === 3 && (
          <Link href={`/lessons/${lessonId}/exercise`} className={buttonVariants({ className: "min-h-11" })}>
            בדוק סטטוס שיעור
          </Link>
        )}
        {!passed && level === 1 && (
          <Link href={`/lessons/${lessonId}?retry=true`} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
            חזור לשיעור
          </Link>
        )}
        {!passed && level === 3 && (
          <Link href={`/lessons/${lessonId}/exercise`} className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
            נסה שוב
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create whatsapp-card.tsx**

```typescript
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function WhatsAppCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card px-6 py-8 text-center space-y-4">
      <p className="text-3xl">📱</p>
      <h2 className="font-heading text-xl font-bold">נכשלת — אל תתייאש!</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        יש לתאם שיעור עם חגי כדי לתרגל את החומר על מנת להמשיך.
      </p>
      <Link
        href="https://wa.me/972525211955"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ className: "min-h-11 bg-[#25D366] hover:bg-[#25D366]/90 text-white" })}
      >
        קבע שיעור עם חגי
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(student)/lessons/[id]/exercise/_components/result-card.tsx app/(student)/lessons/[id]/exercise/_components/whatsapp-card.tsx
git commit -m "feat(student): result card + WhatsApp card | כרטיסי תוצאה ו-WhatsApp"
git push origin main
```

---

### Task 14: Remove Old Exercise Routes + Update Navigation

**Files:**
- Delete: `app/(student)/exercises/` (entire directory)
- Modify: `app/(student)/_components/bottom-tab-bar.tsx`
- Modify: `app/(student)/layout.tsx`

- [ ] **Step 1: Delete old exercises directory**

```bash
rm -rf app/(student)/exercises
```

- [ ] **Step 2: Update bottom-tab-bar.tsx**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BookOpenIcon, FileTextIcon, TrendingUpIcon, LockIcon } from "lucide-react";
import type { ComponentType } from "react";

interface Props {
  denied: string[];
  marketLocked?: boolean;
}

type TabItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  page: string | null;
  exact?: boolean;
};

const tabs: TabItem[] = [
  { href: "/",          label: "בית",    icon: HomeIcon,       page: null,       exact: true },
  { href: "/lessons",   label: "שיעורים", icon: BookOpenIcon,   page: "lessons"              },
  { href: "/summaries", label: "סיכומים", icon: FileTextIcon,   page: "summaries"            },
  { href: "/market",    label: "מניות",   icon: TrendingUpIcon, page: null                   },
];

export function BottomTabBar({ denied, marketLocked }: Props) {
  const pathname = usePathname();
  const deniedSet = new Set(denied);
  const visibleTabs = tabs.filter((t) => t.page === null || !deniedSet.has(t.page));

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-sm pb-safe-area md:hidden"
      aria-label="ניווט ראשי"
    >
      <div className="flex items-stretch">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isMarket = tab.href === "/market";
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors min-h-14 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 start-1/4 end-1/4 h-0.5 rounded-full bg-primary" aria-hidden="true" />
              )}
              <div className="relative">
                <Icon className="size-5" aria-hidden={true} />
                {isMarket && marketLocked && (
                  <LockIcon className="absolute -bottom-1 -end-1 size-3 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Update student layout.tsx** — remove exercises link, add market link, pass marketLocked

In the desktop nav, replace the exercises link with a market link:

```tsx
// Remove:
{!denied.has("exercises") && (
  <Link href="/exercises" ...>תרגולי שיעורים</Link>
)}

// Add market link (always visible; lock is visual only):
<Link
  href="/market"
  className="flex min-h-11 items-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
>
  מניות
</Link>
```

For the `BottomTabBar`, we need to pass `marketLocked`. To compute this in the layout, check if the user has all lessons completed OR has a market permission row:

Actually, computing lock state in layout adds DB queries. Keep layout simple: pass `marketLocked={false}` for now and let the market page itself handle the locked state with a full-page gate. The lock icon on the tab is a nice-to-have that can be added later.

Simply pass: `<BottomTabBar denied={deniedList} />` (marketLocked prop defaults undefined = false).

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | grep -E "Error|error TS" | head -30
```

- [ ] **Step 5: Commit**

```bash
git add app/(student)/_components/bottom-tab-bar.tsx app/(student)/layout.tsx
git commit -m "feat(nav): remove exercises tab, add מניות tab | עדכון ניווט"
git push origin main
```

---

### Task 15: Admin Market Posts

**Files:**
- Create: `app/admin/market/page.tsx`
- Create: `app/admin/market/actions.ts`
- Create: `app/admin/market/new/page.tsx`
- Create: `app/admin/market/[id]/edit/page.tsx`

- [ ] **Step 1: Create app/admin/market/actions.ts**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireUser } from "@/lib/auth/require-user";
import type { ActionState } from "@/app/(auth)/actions";

const postSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת").max(200),
  body: z.string().min(1, "תוכן נדרש"),
  image_url: z.string().url("כתובת URL לא תקינה").optional(),
});

export async function createMarketPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const user = await requireUser();

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    image_url: formData.get("image_url") || undefined,
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("market_posts").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    image_url: parsed.data.image_url ?? null,
    author_id: user.id,
  });

  if (error) return { status: "error", error: "שגיאה ביצירת העדכון" };

  revalidatePath("/admin/market");
  revalidatePath("/market");
  redirect("/admin/market");
}

export async function updateMarketPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה חסר" };

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    image_url: formData.get("image_url") || undefined,
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase
    .from("market_posts")
    .update({ title: parsed.data.title, body: parsed.data.body, image_url: parsed.data.image_url ?? null })
    .eq("id", id);

  if (error) return { status: "error", error: "שגיאה בעדכון הפוסט" };

  revalidatePath("/admin/market");
  revalidatePath("/market");
  redirect("/admin/market");
}

export async function deleteMarketPostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const supabase = asUntyped(await createClient());
  await supabase.from("market_posts").delete().eq("id", id);

  revalidatePath("/admin/market");
  revalidatePath("/market");
}
```

- [ ] **Step 2: Create app/admin/market/page.tsx**

```typescript
import Link from "next/link";
import { TrendingUpIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteMarketPostAction } from "./actions";
import type { MarketPostRow } from "@/lib/types/course-types";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function AdminMarketPage() {
  await requireAdmin();
  const supabase = asUntyped(await createClient());

  const { data: posts } = (await supabase
    .from("market_posts")
    .select("*")
    .order("created_at", { ascending: false })) as { data: MarketPostRow[] | null };

  const list = posts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-bold text-foreground">עדכוני מניות</h1>
        </div>
        <Link href="/admin/market/new" className={buttonVariants({ className: "min-h-11" })}>
          פרסם עדכון
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">עדכונים ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">עדיין אין עדכונים.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {list.map((post) => (
                <li key={post.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{post.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/market/${post.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-9" })}
                    >
                      ערוך
                    </Link>
                    <form action={deleteMarketPostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-9 items-center rounded-md border border-destructive/30 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        מחק
                      </button>
                    </form>
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

- [ ] **Step 3: Create app/admin/market/new/page.tsx**

```typescript
import { requireAdmin } from "@/lib/auth/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketPostForm } from "../_components/market-post-form";
import { createMarketPostAction } from "../actions";

export default async function NewMarketPostPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">פרסום עדכון חדש</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי העדכון</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <MarketPostForm action={createMarketPostAction} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create app/admin/market/_components/market-post-form.tsx**

```typescript
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/app/(auth)/actions";
import type { MarketPostRow } from "@/lib/types/course-types";

interface Props {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaultValues?: Partial<MarketPostRow>;
  postId?: string;
}

export function MarketPostForm({ action, defaultValues, postId }: Props) {
  const [state, formAction, isPending] = useActionState(action, { status: "idle" });

  return (
    <form action={formAction} className="space-y-5">
      {postId && <input type="hidden" name="id" value={postId} />}

      <div className="space-y-2">
        <Label htmlFor="title">כותרת</Label>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} placeholder="כותרת העדכון" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">תוכן</Label>
        <textarea
          id="body" name="body" required rows={6}
          defaultValue={defaultValues?.body}
          placeholder="תוכן העדכון..."
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">כתובת תמונה (אופציונלי)</Label>
        <Input id="image_url" name="image_url" dir="ltr" defaultValue={defaultValues?.image_url ?? ""} placeholder="https://..." />
      </div>

      {state.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : postId ? "עדכן" : "פרסם"}
        </Button>
        <Link href="/admin/market" className="text-sm text-muted-foreground hover:text-foreground">ביטול</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create app/admin/market/[id]/edit/page.tsx**

```typescript
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketPostForm } from "../../_components/market-post-form";
import { updateMarketPostAction } from "../../actions";
import type { MarketPostRow } from "@/lib/types/course-types";

interface Props { params: Promise<{ id: string }> }

export default async function EditMarketPostPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = asUntyped(await createClient());

  const { data: post } = (await supabase
    .from("market_posts")
    .select("*")
    .eq("id", id)
    .single()) as { data: MarketPostRow | null };

  if (!post) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">עריכת עדכון</h1>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold">פרטי העדכון</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <MarketPostForm action={updateMarketPostAction} defaultValues={post} postId={post.id} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/market/
git commit -m "feat(admin): market posts CRUD | ניהול עדכוני מניות"
git push origin main
```

---

### Task 16: Student Market Posts Page

**Files:**
- Create: `app/(student)/market/page.tsx`

- [ ] **Step 1: Create market/page.tsx**

```typescript
import { TrendingUpIcon, LockIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { Card, CardContent } from "@/components/ui/card";
import type { LessonRow, LessonProgressRow, MarketPostRow, UserPermissionRow } from "@/lib/types/course-types";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function MarketPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: lessons },
    { data: progress },
    { data: permissions },
  ] = await Promise.all([
    db.from("lessons").select("id") as unknown as Promise<{ data: Pick<LessonRow, "id">[] | null }>,
    db.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", user.id) as unknown as Promise<{ data: Pick<LessonProgressRow, "lesson_id" | "completed_at">[] | null }>,
    db.from("user_permissions").select("page").eq("user_id", user.id).eq("page", "market") as unknown as Promise<{ data: Pick<UserPermissionRow, "page">[] | null }>,
  ]);

  const allLessonIds = (lessons ?? []).map((l) => l.id);
  const completedIds = new Set((progress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id));
  const allLessonsComplete = allLessonIds.length > 0 && allLessonIds.every((id) => completedIds.has(id));
  const hasOverride = (permissions ?? []).length > 0;
  const canAccess = allLessonsComplete || hasOverride;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <LockIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-xl font-bold">עמוד זה נעול</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          סיים את הקורס כדי לגשת לתוכן הזה.
        </p>
      </div>
    );
  }

  const { data: posts } = (await db
    .from("market_posts")
    .select("*")
    .order("created_at", { ascending: false })) as { data: MarketPostRow[] | null };

  const list = posts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUpIcon className="size-6 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold text-foreground">מניות בזמן אמת</h1>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין עדכונים. חזור בקרוב.</p>
      ) : (
        <div className="space-y-4">
          {list.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-heading text-base font-bold">{post.title}</h2>
                  <time className="shrink-0 text-xs text-muted-foreground">{formatDate(post.created_at)}</time>
                </div>
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full rounded-lg object-cover max-h-64"
                  />
                )}
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Final build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: successful build with no TypeScript errors.

- [ ] **Step 3: Run RLS and code auditors in parallel**

Spawn supabase-rls-checker and code-reviewer agents to audit the new tables and Server Actions.

- [ ] **Step 4: Commit**

```bash
git add app/(student)/market/page.tsx
git commit -m "feat(student): market posts page with access gate | עמוד עדכוני מניות"
git push origin main
```

---

## Self-Review

**Spec coverage check:**
- ✅ Topics UI rename (Task 3)
- ✅ YouTube embed utility (Task 4)
- ✅ DB schema: level, pass_threshold, lesson_unlocks, market_posts, user_permissions enum (Task 1)
- ✅ TypeScript types updated (Task 2)
- ✅ Admin wizard level selector (Task 5)
- ✅ Admin wizard quiz builder (Task 6)
- ✅ Admin wizard buildContentJson + actions with level (Task 7)
- ✅ Admin lesson form pass_threshold (Task 4)
- ✅ Admin student lesson unlock (Task 8)
- ✅ Student lessons grouped by topic + lock state (Task 9)
- ✅ Student lesson page exercise button + retry banner (Task 10)
- ✅ Exercise flow page with level routing (Task 11)
- ✅ Chart-click and quiz exercise components (Task 12)
- ✅ Result cards + WhatsApp card (Task 13)
- ✅ Remove old exercises routes + update nav tabs (Task 14)
- ✅ Admin market posts CRUD (Task 15)
- ✅ Student market posts page (Task 16)

**Known follow-ups (post-plan):**
- The `requireAdmin()` function in `lib/auth/require-admin.ts` likely returns `void`. The `unlockLessonAction` workaround uses `requireUser()` separately for `unlocked_by` — verify this matches the actual implementation.
- The `CandleChart` component's `mode="student-click"` and `onStudentClick` props may need to be verified against the actual component interface in `components/candle-chart.tsx`.
