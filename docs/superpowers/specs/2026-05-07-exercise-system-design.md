# Exercise System Design — Hagai Gilis Trading Education PWA

**Date:** 2026-05-07  
**Status:** Approved  
**Author:** Brainstorming session with Hagai

---

## Context

The app currently has a basic exercise system (`candle_chart_select` type) where students click a candle and the system checks against a hardcoded `correct_candle_index`. There is no admin UI to create exercises — they are seeded via SQL migrations.

This design replaces that with two proper exercise types, a visual admin builder wizard, and server-side answer validation. The goal is to let Hagai create exercises himself from TradingView charts, without touching SQL.

---

## Two Exercise Types

### 1. `chart_click` — לחיצה על גרף
Student clicks anywhere on the chart. The system records the price and candle index of the click. The admin pre-defines an **acceptance zone** (a price range + candle range rectangle). The answer is correct if the click falls inside the zone.

### 2. `multiple_choice` — שאלה אמריקאית
Student views a chart (read-only) and picks one of 4 Hebrew options. The chart provides visual context; the student selects using buttons below the chart.

Both types support:
- Support and resistance lines with optional Hebrew labels
- An explanation shown to the student after they submit

---

## Data Model

### `exercises.content_json` shapes

```typescript
// Type 1
type ChartClickExercise = {
  type: "chart_click";
  question: string;
  candles: CandleData[];
  support_levels: { price: number; label?: string }[];
  resistance_levels: { price: number; label?: string }[];
  acceptance_zone: {
    min_price: number;
    max_price: number;
    start_candle_index: number; // 0-based, inclusive
    end_candle_index: number;   // 0-based, inclusive
  };
  explanation: string;
};

// Type 2
type MultipleChoiceExercise = {
  type: "multiple_choice";
  question: string;
  candles: CandleData[];
  support_levels: { price: number; label?: string }[];
  resistance_levels: { price: number; label?: string }[];
  options: [string, string, string, string]; // exactly 4 Hebrew options
  correct_option_index: 0 | 1 | 2 | 3;
  explanation: string;
};

// Existing type — keep for backwards compatibility, no new exercises of this type
type CandleChartExercise = {
  type: "candle_chart_select";
  // ... existing shape unchanged
};

type ExerciseContent = ChartClickExercise | MultipleChoiceExercise | CandleChartExercise;
```

### `exercise_submissions.answer_data` shapes

```typescript
// chart_click submission
type ChartClickAnswer = {
  clicked_price: number;
  clicked_candle_index: number;
};

// multiple_choice submission
type MultipleChoiceAnswer = {
  selected_option_index: 0 | 1 | 2 | 3;
};
```

### No schema migration needed
The `exercises` and `exercise_submissions` tables already exist with JSONB columns. The new types are additive — they coexist with `candle_chart_select`.

---

## Chart Component Changes

The existing `CandleChart` SVG component (`components/candle-chart.tsx`) gains a `mode` prop:

| Mode | Who uses it | Behaviour |
|---|---|---|
| `view-only` | MC exercise, lesson page | Renders chart + lines, no interaction |
| `student-click` | chart_click exercise | Crosshair on hover, click sets a point marker, shows price+date readout below chart |
| `admin-draw` | Admin wizard step 3 | Crosshair on hover, mouse-drag draws acceptance zone rectangle, corner handles to resize |

Support/resistance lines now accept a `label` string displayed at the end of the line.

---

## Student Exercise Flow

### chart_click
1. Student sees chart with support/resistance overlays and question text
2. Hover shows crosshair with live price + date readout
3. Click places an orange dot; a bar below the chart shows "תאריך: DD/MM | מחיר: ₪XXX | לחץ לשינוי"
4. "שלח תשובה" button is enabled once a point is placed
5. `submitExerciseAction` sends `{ clicked_price, clicked_candle_index }` to server
6. Server validates: checks if both values fall inside `acceptance_zone`
7. Correct → green banner + explanation. Incorrect → orange banner + explanation + acceptance zone shown in green on chart

### multiple_choice
1. Student sees chart (view-only) + question + 4 Hebrew option buttons (א/ב/ג/ד)
2. Tap a button to select (highlighted in orange border)
3. "שלח תשובה" enabled once an option is selected
4. `submitExerciseAction` sends `{ selected_option_index }` to server
5. Server validates against `correct_option_index`
6. Correct → green banner + explanation. Incorrect → orange banner + explanation + correct option revealed

### Validation is server-side for both types
The exercise page (`[id]/page.tsx`) is a Server Component. Before passing the exercise to a Client Component, it strips sensitive fields:

```typescript
// Sanitize before passing to client
function sanitizeExercise(content: ExerciseContent): SanitizedExercise {
  if (content.type === "chart_click") {
    const { acceptance_zone, ...rest } = content;
    return rest; // acceptance_zone never reaches the browser
  }
  if (content.type === "multiple_choice") {
    const { correct_option_index, ...rest } = content;
    return rest; // correct_option_index never reaches the browser
  }
  return content;
}
```

The server action re-fetches the full exercise from the DB to validate — it never trusts what the client sends about the correct answer.

---

## Admin Exercise Builder

Located at `/app/admin/exercises/new/page.tsx` and `/app/admin/exercises/[id]/edit/page.tsx`.

A 4-step wizard. Step 3 changes depending on exercise type.

### Step 1 — סוג תרגיל
Two large cards: "לחיצה על גרף" and "שאלה אמריקאית". Select one to continue.

### Step 2 — נתוני גרף
- Large textarea for CSV paste: `date,open,high,low,close` (one row per candle)
- Live chart preview updates as the admin types/pastes
- "הוסף קו" section: add support/resistance lines with price + optional Hebrew label
- Notes a future workflow: admin can send a TradingView screenshot to Claude to generate the CSV

### Step 3a — אזור קבלה (chart_click only)
- Full chart preview in `admin-draw` mode
- Admin drags to draw the acceptance zone rectangle
- Status bar below chart: "אזור: מחיר ₪135–₪152 | נרות 5–6"
- Corner handles allow resizing after drawing

### Step 3b — אפשרויות תשובה (multiple_choice only)
- Four text inputs labeled א, ב, ג, ד
- Radio button next to each to mark the correct answer
- Chart shown above in `view-only` mode for reference

### Step 4 — שאלה והסבר
- Textarea: question text (Hebrew)
- Textarea: explanation shown after submission (Hebrew)
- Dropdown: which lesson this exercise belongs to
- Number input: order within the lesson
- "שמור תרגיל" CTA

Wizard state lives in React `useState` — no server calls until step 4 "שמור".

---

## Admin Exercise List

`/app/admin/exercises/page.tsx` — currently shows student progress. Add a top section:

- "תרגילים" tab: lists all exercises with title, type badge, lesson name, edit/delete buttons
- "התקדמות תלמידים" tab: existing student progress view

---

## Server Actions

### `createExerciseAction` / `updateExerciseAction`
- Location: `app/admin/exercises/actions.ts`
- Zod validates the full `content_json` shape before upsert
- Requires `requireAdmin()`
- Revalidates `/admin/exercises` and the relevant student exercise pages

### `submitExerciseAction` (extend existing)
- Location: `app/(student)/exercises/[id]/actions.ts`
- Add handling for `chart_click` and `multiple_choice` answer shapes
- Validate answer against `content_json` server-side
- Return `{ success: true, correct: boolean, explanation: string }` so client can show feedback without a second fetch

---

## Files Changing

| File | Change |
|---|---|
| `components/candle-chart.tsx` | Add `mode` prop, crosshair, click handler, drag-zone, line labels |
| `lib/types/course-types.ts` | Add `ChartClickExercise`, `MultipleChoiceExercise` union types |
| `app/(student)/exercises/[id]/page.tsx` | Route to correct component per exercise type |
| `app/(student)/exercises/[id]/_components/chart-exercise.tsx` | Refactor for `chart_click` |
| `app/(student)/exercises/[id]/_components/multiple-choice-exercise.tsx` | New component |
| `app/(student)/exercises/[id]/actions.ts` | Server-side validation for both types |
| `app/admin/exercises/page.tsx` | Add exercises tab + list |
| `app/admin/exercises/new/page.tsx` | New — 4-step wizard |
| `app/admin/exercises/[id]/edit/page.tsx` | New — same wizard pre-filled |
| `app/admin/exercises/actions.ts` | New — `createExerciseAction`, `updateExerciseAction`, `deleteExerciseAction` |
| `app/admin/exercises/_components/exercise-wizard.tsx` | New — wizard shell |
| `app/admin/exercises/_components/wizard-steps/` | New — 4 step components |

---

## Future Enhancement: AI-from-Image

Two-phase plan:

**Phase 1 (now — workflow, no building):** Hagai takes a TradingView screenshot → pastes it into a Claude Code conversation → Claude reads the chart and generates the OHLC CSV → Hagai pastes it into the wizard's step 2. This works today.

**Phase 2 (future — in-app):** An "העלה תמונה" button in step 2 of the wizard. Uploads the image to a Server Action that calls the Claude API with vision capability to extract OHLC data and return pre-filled CSV. Requires Anthropic API key in env.

---

## Verification

1. **Admin creates a chart_click exercise** via the wizard — OHLC CSV paste → acceptance zone draw → question → save. Confirm it appears in the exercises list and `exercises` table has valid `content_json`.
2. **Student submits a correct click** — clicks inside the acceptance zone, submits, sees green feedback with explanation.
3. **Student submits an incorrect click** — clicks outside the zone, sees orange feedback + correct zone revealed on chart.
4. **Admin creates a multiple_choice exercise** — 4 options + correct answer marked → save.
5. **Student answers multiple choice** — selects option, submits, sees feedback.
6. **Existing `candle_chart_select` exercise** (Lesson 4) still works with no changes.
7. **RTL audit** — all new Hebrew text is RTL, option letters א/ב/ג/ד display correctly.
8. **RLS audit** — no new tables; existing exercise RLS policies cover the new `content_json` shapes.
