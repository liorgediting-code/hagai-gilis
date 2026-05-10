# Exercise System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full exercise system with two interactive types (`chart_click` and `multiple_choice`), a 4-step admin wizard to create exercises, and server-side answer validation.

**Architecture:** Extend the existing `exercises` / `exercise_submissions` tables (no migration needed — `content_json` is JSONB). Add a `mode` prop to the existing SVG `CandleChart` for interactive chart modes. Server-side validation strips sensitive fields before sending to the client.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind + shadcn/ui, Supabase (Postgres + RLS), Zod, SVG.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/types/exercise-types.ts` | **Create** | All new types + Zod schemas for both exercise types |
| `lib/utils/parse-candle-csv.ts` | **Create** | Parse CSV string → `CandleData[]` |
| `components/candle-chart.tsx` | **Modify** | Add `mode`, crosshair, click-to-point, drag-to-zone, array line props |
| `app/(student)/exercises/[id]/actions.ts` | **Modify** | Server-side validation, new return type |
| `app/(student)/exercises/[id]/page.tsx` | **Modify** | Route by type, sanitize `content_json` |
| `app/(student)/exercises/[id]/_components/chart-exercise.tsx` | **Modify** | Adapt to `chart_click` type + new action return |
| `app/(student)/exercises/[id]/_components/multiple-choice-exercise.tsx` | **Create** | MC exercise UI component |
| `app/admin/exercises/actions.ts` | **Create** | `createExerciseAction`, `updateExerciseAction`, `deleteExerciseAction` |
| `app/admin/exercises/page.tsx` | **Modify** | Add exercises list tab above student progress |
| `app/admin/exercises/new/page.tsx` | **Create** | New exercise page (renders wizard) |
| `app/admin/exercises/[id]/edit/page.tsx` | **Create** | Edit exercise page (renders wizard pre-filled) |
| `app/admin/exercises/_components/exercise-wizard.tsx` | **Create** | 4-step wizard shell with state |
| `app/admin/exercises/_components/wizard-step-1-type.tsx` | **Create** | Type selector step |
| `app/admin/exercises/_components/wizard-step-2-data.tsx` | **Create** | CSV paste + support/resistance lines |
| `app/admin/exercises/_components/wizard-step-3-zone.tsx` | **Create** | Drag acceptance zone (chart_click) |
| `app/admin/exercises/_components/wizard-step-3-options.tsx` | **Create** | 4 MC option inputs |
| `app/admin/exercises/_components/wizard-step-4-question.tsx` | **Create** | Question, explanation, lesson, order |

---

## Task 1: New type definitions

**Files:**
- Create: `lib/types/exercise-types.ts`

- [ ] **Step 1: Create the types file**

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
  start_candle_index: number; // 0-based, inclusive
  end_candle_index: number;   // 0-based, inclusive
};

export type ChartClickExercise = {
  type: "chart_click";
  question: string;
  candles: CandleData[];
  support_levels: PriceLine[];
  resistance_levels: PriceLine[];
  acceptance_zone: AcceptanceZone;
  explanation: string;
};

export type MultipleChoiceExercise = {
  type: "multiple_choice";
  question: string;
  candles: CandleData[];
  support_levels: PriceLine[];
  resistance_levels: PriceLine[];
  options: [string, string, string, string];
  correct_option_index: 0 | 1 | 2 | 3;
  explanation: string;
};

// Safe versions — sensitive fields stripped before sending to client
export type SanitizedChartClickExercise = Omit<ChartClickExercise, "acceptance_zone">;
export type SanitizedMultipleChoiceExercise = Omit<MultipleChoiceExercise, "correct_option_index">;

export type ExerciseContent =
  | ChartClickExercise
  | MultipleChoiceExercise
  | { type: "candle_chart_select"; [key: string]: unknown }; // legacy

export type SanitizedExerciseContent =
  | SanitizedChartClickExercise
  | SanitizedMultipleChoiceExercise
  | { type: "candle_chart_select"; [key: string]: unknown }; // legacy pass-through

export type ChartClickAnswer = {
  clicked_price: number;
  clicked_candle_index: number;
};

export type MultipleChoiceAnswer = {
  selected_option_index: 0 | 1 | 2 | 3;
};

export type ExerciseSubmitResult = {
  status: "idle" | "success" | "error";
  error?: string;
  correct?: boolean;
  explanation?: string;
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
});

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
  acceptance_zone: acceptanceZoneSchema,
  explanation: z.string().min(1, "הסבר נדרש"),
});

export const multipleChoiceSchema = z.object({
  type: z.literal("multiple_choice"),
  question: z.string().min(1, "שאלה נדרשת"),
  candles: z.array(candleDataSchema).min(3, "נדרשים לפחות 3 נרות"),
  support_levels: z.array(priceLineSchema),
  resistance_levels: z.array(priceLineSchema),
  options: z.tuple([
    z.string().min(1, "אפשרות א נדרשת"),
    z.string().min(1, "אפשרות ב נדרשת"),
    z.string().min(1, "אפשרות ג נדרשת"),
    z.string().min(1, "אפשרות ד נדרשת"),
  ]),
  correct_option_index: z.union([
    z.literal(0), z.literal(1), z.literal(2), z.literal(3),
  ]),
  explanation: z.string().min(1, "הסבר נדרש"),
});

export const exerciseContentSchema = z.discriminatedUnion("type", [
  chartClickSchema,
  multipleChoiceSchema,
]);
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/exercise-types.ts
git commit -m "feat(exercises): add ChartClick + MultipleChoice type definitions | הגדרת טיפוסים לתרגילים חדשים"
```

---

## Task 2: CSV parser utility

**Files:**
- Create: `lib/utils/parse-candle-csv.ts`

- [ ] **Step 1: Create the parser**

```typescript
// lib/utils/parse-candle-csv.ts
import type { CandleData } from "@/lib/types/course-types";

/**
 * Parses a CSV string (date,open,high,low,close) into CandleData[].
 * Skips blank lines and the header row if present.
 * Returns { candles, errors } — errors lists human-readable problems.
 */
export function parseCandleCSV(raw: string): {
  candles: CandleData[];
  errors: string[];
} {
  const errors: string[] = [];
  const candles: CandleData[] = [];

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) {
      // Skip header or malformed rows
      if (line.toLowerCase().includes("date") || line.toLowerCase().includes("open")) continue;
      errors.push(`שורה לא תקינה (${parts.length} עמודות): ${line}`);
      continue;
    }

    const [date, openStr, highStr, lowStr, closeStr] = parts;
    const open = parseFloat(openStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const close = parseFloat(closeStr);

    if ([open, high, low, close].some(isNaN)) {
      errors.push(`ערך מחיר לא מספרי בשורה: ${line}`);
      continue;
    }

    candles.push({ date, open, high, low, close });
  }

  return { candles, errors };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils/parse-candle-csv.ts
git commit -m "feat(exercises): add CSV candle data parser | פרסור נתוני נרות מ-CSV"
```

---

## Task 3: Extend CandleChart with interactive modes

**Files:**
- Modify: `components/candle-chart.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
// components/candle-chart.tsx
"use client";

import { useRef, useState } from "react";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone } from "@/lib/types/exercise-types";

interface CandleChartProps {
  candles: CandleData[];
  mode?: "view-only" | "student-click" | "admin-draw";

  // Price lines (new array format)
  supportLevels?: PriceLine[];
  resistanceLevels?: PriceLine[];

  // Legacy single-level props (kept for candle_chart_select backwards compat)
  resistanceLevel?: number;
  supportLevel?: number;

  // student-click mode
  selectedPoint?: { price: number; candleIndex: number } | null;
  onPointClick?: (price: number, candleIndex: number) => void;

  // admin-draw mode
  acceptanceZone?: AcceptanceZone | null;
  onZoneDraw?: (zone: AcceptanceZone) => void;

  // Legacy candle_chart_select props
  selectedIndex?: number | null;
  correctIndex?: number | null;
  showSolution?: boolean;
  onCandleClick?: (index: number) => void;
}

const W = 800;
const H = 380;
const PAD_X = 8;
const PAD_Y = 28;

export function CandleChart({
  candles,
  mode = "view-only",
  supportLevels = [],
  resistanceLevels = [],
  resistanceLevel,
  supportLevel,
  selectedPoint,
  onPointClick,
  acceptanceZone,
  onZoneDraw,
  selectedIndex,
  correctIndex,
  showSolution = false,
  onCandleClick,
}: CandleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverSVG, setHoverSVG] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  // Merge legacy single-level props into array format
  const allSupportLevels: PriceLine[] = [
    ...supportLevels,
    ...(supportLevel !== undefined ? [{ price: supportLevel }] : []),
  ];
  const allResistanceLevels: PriceLine[] = [
    ...resistanceLevels,
    ...(resistanceLevel !== undefined ? [{ price: resistanceLevel }] : []),
  ];

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  allSupportLevels.forEach((l) => allPrices.push(l.price));
  allResistanceLevels.forEach((l) => allPrices.push(l.price));

  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const priceRange = rawMax - rawMin || 1;
  const paddingAmt = priceRange * 0.06;
  const minPrice = rawMin - paddingAmt;
  const maxPrice = rawMax + paddingAmt;
  const totalRange = maxPrice - minPrice;

  const slotW = chartW / candles.length;
  const bodyW = Math.max(4, slotW * 0.6);

  function scaleY(price: number): number {
    return PAD_Y + chartH - ((price - minPrice) / totalRange) * chartH;
  }

  function svgCoords(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function svgXToCandleIndex(svgX: number): number {
    const relX = svgX - PAD_X;
    return Math.max(0, Math.min(candles.length - 1, Math.floor(relX / slotW)));
  }

  function svgYToPrice(svgY: number): number {
    return maxPrice - ((svgY - PAD_Y) / chartH) * totalRange;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === "view-only") return;
    setHoverSVG(svgCoords(e));
    if (mode === "admin-draw" && dragStart) {
      setDragCurrent(svgCoords(e));
    }
  }

  function handleMouseLeave() {
    setHoverSVG(null);
    if (mode === "admin-draw" && dragStart) {
      setDragStart(null);
      setDragCurrent(null);
    }
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== "admin-draw") return;
    e.preventDefault();
    setDragStart(svgCoords(e));
    setDragCurrent(svgCoords(e));
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === "student-click" && onPointClick) {
      const { x, y } = svgCoords(e);
      const candleIndex = svgXToCandleIndex(x);
      const price = svgYToPrice(y);
      onPointClick(price, candleIndex);
    }

    if (mode === "admin-draw" && dragStart && onZoneDraw) {
      const end = svgCoords(e);
      const zone: AcceptanceZone = {
        start_candle_index: svgXToCandleIndex(Math.min(dragStart.x, end.x)),
        end_candle_index: svgXToCandleIndex(Math.max(dragStart.x, end.x)),
        min_price: svgYToPrice(Math.max(dragStart.y, end.y)),
        max_price: svgYToPrice(Math.min(dragStart.y, end.y)),
      };
      onZoneDraw(zone);
      setDragStart(null);
      setDragCurrent(null);
    }
  }

  const gridPrices = [0.25, 0.5, 0.75].map(
    (f) => minPrice + totalRange * f,
  );

  // Compute acceptance zone to render (committed zone or drag-in-progress)
  const zoneToDraw: AcceptanceZone | null = (() => {
    if (dragStart && dragCurrent) {
      return {
        start_candle_index: svgXToCandleIndex(Math.min(dragStart.x, dragCurrent.x)),
        end_candle_index: svgXToCandleIndex(Math.max(dragStart.x, dragCurrent.x)),
        min_price: svgYToPrice(Math.max(dragStart.y, dragCurrent.y)),
        max_price: svgYToPrice(Math.min(dragStart.y, dragCurrent.y)),
      };
    }
    return acceptanceZone ?? null;
  })();

  const cursorStyle =
    mode === "student-click" ? "crosshair" :
    mode === "admin-draw" ? "crosshair" : "default";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ height: "auto", cursor: cursorStyle, userSelect: "none" }}
      aria-label="גרף נרות יפניים"
      role={mode !== "view-only" ? "button" : "img"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Grid */}
      {gridPrices.map((price) => {
        const y = scaleY(price);
        return (
          <g key={price}>
            <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y}
              stroke="currentColor" strokeWidth={0.5} strokeDasharray="4 4" strokeOpacity={0.2} />
            <text x={W - PAD_X - 2} y={y - 3} textAnchor="end"
              fontSize={9} fill="currentColor" fillOpacity={0.45}>
              {price.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Resistance lines */}
      {allResistanceLevels.map((line, i) => (
        <g key={`r${i}`}>
          <line x1={PAD_X} y1={scaleY(line.price)} x2={W - PAD_X} y2={scaleY(line.price)}
            stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={PAD_X + 4} y={scaleY(line.price) - 4} textAnchor="start"
            fontSize={9} fill="#ef4444" fillOpacity={0.85}>
            {line.label ?? `התנגדות ${line.price.toFixed(0)}`}
          </text>
        </g>
      ))}

      {/* Support lines */}
      {allSupportLevels.map((line, i) => (
        <g key={`s${i}`}>
          <line x1={PAD_X} y1={scaleY(line.price)} x2={W - PAD_X} y2={scaleY(line.price)}
            stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3" />
          <text x={PAD_X + 4} y={scaleY(line.price) + 12} textAnchor="start"
            fontSize={9} fill="#22c55e" fillOpacity={0.85}>
            {line.label ?? `תמיכה ${line.price.toFixed(0)}`}
          </text>
        </g>
      ))}

      {/* Acceptance zone overlay */}
      {zoneToDraw && (() => {
        const x1 = PAD_X + zoneToDraw.start_candle_index * slotW;
        const x2 = PAD_X + (zoneToDraw.end_candle_index + 1) * slotW;
        const y1 = scaleY(zoneToDraw.max_price);
        const y2 = scaleY(zoneToDraw.min_price);
        return (
          <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
            fill="#22c55e" fillOpacity={0.15}
            stroke="#22c55e" strokeWidth={2} strokeDasharray="6 3" rx={4} />
        );
      })()}

      {/* Candles */}
      {candles.map((candle, i) => {
        const cx = PAD_X + i * slotW + slotW / 2;
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? "#22c55e" : "#ef4444";
        const bodyTop = scaleY(Math.max(candle.open, candle.close));
        const bodyBottom = scaleY(Math.min(candle.open, candle.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);
        const wickTop = scaleY(candle.high);
        const wickBottom = scaleY(candle.low);

        // Legacy highlight logic (candle_chart_select)
        const isSelected = selectedIndex === i;
        const isCorrect = correctIndex === i;
        let legacyBg: string | null = null;
        if (showSolution) {
          if (isCorrect) legacyBg = "#22c55e";
          else if (isSelected) legacyBg = "#ef4444";
        } else if (isSelected) {
          legacyBg = "#f97316";
        }

        return (
          <g key={i}>
            {legacyBg && (
              <rect x={PAD_X + i * slotW} y={PAD_Y} width={slotW} height={chartH}
                fill={legacyBg} fillOpacity={0.15} />
            )}
            <line x1={cx} y1={wickTop} x2={cx} y2={wickBottom}
              stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
              fill={color} fillOpacity={0.8} />
            {!showSolution && isSelected && (
              <rect x={cx - bodyW / 2 - 1} y={bodyTop - 1} width={bodyW + 2} height={bodyH + 2}
                fill="none" stroke="#f97316" strokeWidth={1.5} />
            )}
            {onCandleClick && (
              <rect x={PAD_X + i * slotW} y={PAD_Y} width={slotW} height={chartH}
                fill="transparent" style={{ cursor: "pointer" }}
                onClick={() => onCandleClick(i)} aria-label={`נר ${i + 1}`} role="button" />
            )}
            {i % 5 === 0 && (
              <text x={cx} y={H - 6} textAnchor="middle"
                fontSize={9} fill="currentColor" fillOpacity={0.4}>
                {candle.date}
              </text>
            )}
          </g>
        );
      })}

      {/* Student-click selected point marker */}
      {selectedPoint && mode === "student-click" && (() => {
        const cx = PAD_X + (selectedPoint.candleIndex + 0.5) * slotW;
        const cy = scaleY(selectedPoint.price);
        return (
          <>
            <line x1={cx} y1={PAD_Y} x2={cx} y2={H - PAD_Y}
              stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7} />
            <line x1={PAD_X} y1={cy} x2={W - PAD_X} y2={cy}
              stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7} />
            <circle cx={cx} cy={cy} r={6} fill="#f97316" stroke="white" strokeWidth={1.5} />
            <rect x={W - PAD_X - 52} y={cy - 11} width={50} height={14}
              fill="#f97316" rx={3} />
            <text x={W - PAD_X - 27} y={cy} textAnchor="middle"
              fontSize={9} fill="white">
              ₪{selectedPoint.price.toFixed(1)}
            </text>
          </>
        );
      })()}

      {/* Crosshair (hover) */}
      {hoverSVG && mode !== "view-only" && (
        <>
          <line x1={hoverSVG.x} y1={PAD_Y} x2={hoverSVG.x} y2={H - PAD_Y}
            stroke="#f97316" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5} />
          <line x1={PAD_X} y1={hoverSVG.y} x2={W - PAD_X} y2={hoverSVG.y}
            stroke="#f97316" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5} />
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd /Users/liorgabay/Documents/projects/hagai-app && pnpm build 2>&1 | tail -20
```

Expected: no TypeScript errors. Existing `candle_chart_select` exercises still work because all old props are preserved.

- [ ] **Step 3: Commit**

```bash
git add components/candle-chart.tsx
git commit -m "feat(chart): add interactive modes — student-click, admin-draw, crosshair | מצבים אינטראקטיביים לגרף"
```

---

## Task 4: Admin server actions

**Files:**
- Create: `app/admin/exercises/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/admin/exercises/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import { exerciseContentSchema } from "@/lib/types/exercise-types";

const exerciseMetaSchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(2000).optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
  content_json: z.string().min(1, "תוכן תרגיל נדרש"),
});

function parseAndValidateContent(raw: string): { ok: true; data: unknown } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "תוכן התרגיל אינו JSON תקין" };
  }
  const result = exerciseContentSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.errors[0]?.message ?? "תוכן תרגיל לא תקין" };
  }
  return { ok: true, data: result.data };
}

export async function createExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = exerciseMetaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
    content_json: formData.get("content_json"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const content = parseAndValidateContent(parsed.data.content_json);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").insert({
    lesson_id: parsed.data.lesson_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
    content_json: content.data,
  });

  if (error) return { status: "error", error: "שגיאה ביצירת התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
  return { status: "success" };
}

export async function updateExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה תרגיל חסר" };

  const parsed = exerciseMetaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
    content_json: formData.get("content_json"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const content = parseAndValidateContent(parsed.data.content_json);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").update({
    lesson_id: parsed.data.lesson_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
    content_json: content.data,
  }).eq("id", id);

  if (error) return { status: "error", error: "שגיאה בעדכון התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  revalidatePath(`/exercises/${id}`);
  return { status: "success" };
}

export async function deleteExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה תרגיל חסר" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").delete().eq("id", id);

  if (error) return { status: "error", error: "שגיאה במחיקת התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
  return { status: "success" };
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add app/admin/exercises/actions.ts
git commit -m "feat(admin): exercise CRUD server actions with Zod validation | פעולות שרת לניהול תרגילים"
```

---

## Task 5: Admin wizard — Step 1 (type selector) + Step 2 (CSV + lines)

**Files:**
- Create: `app/admin/exercises/_components/wizard-step-1-type.tsx`
- Create: `app/admin/exercises/_components/wizard-step-2-data.tsx`

- [ ] **Step 1: Create Step 1 component**

```typescript
// app/admin/exercises/_components/wizard-step-1-type.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  selected: "chart_click" | "multiple_choice" | null;
  onSelect: (type: "chart_click" | "multiple_choice") => void;
  onNext: () => void;
}

export function WizardStep1Type({ selected, onSelect, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 1 — סוג תרגיל</h2>
        <p className="mt-1 text-sm text-muted-foreground">בחר את סוג התרגיל שברצונך ליצור</p>
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
              הסטודנט לוחץ על נקודה בגרף. האדמין מגדיר אזור קבלה. מתאים לסימון פריצות, נקודות כניסה, ואזורי מחיר.
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${selected === "multiple_choice" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
          onClick={() => onSelect("multiple_choice")}
        >
          <CardContent className="pt-6 pb-6 space-y-2">
            <div className="text-2xl">🔤</div>
            <h3 className="font-semibold">שאלה אמריקאית</h3>
            <p className="text-sm text-muted-foreground">
              4 אפשרויות טקסט, הסטודנט בוחר אחת. הגרף מוצג לצד השאלה כהקשר.
            </p>
          </CardContent>
        </Card>
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

- [ ] **Step 2: Create Step 2 component**

```typescript
// app/admin/exercises/_components/wizard-step-2-data.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { parseCandleCSV } from "@/lib/utils/parse-candle-csv";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine } from "@/lib/types/exercise-types";

interface Props {
  csvRaw: string;
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  onUpdate: (data: {
    csvRaw: string;
    candles: CandleData[];
    supportLevels: PriceLine[];
    resistanceLevels: PriceLine[];
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep2Data({
  csvRaw, candles, supportLevels, resistanceLevels, onUpdate, onNext, onBack,
}: Props) {
  const [csv, setCsv] = useState(csvRaw);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [supports, setSupports] = useState<PriceLine[]>(supportLevels);
  const [resistances, setResistances] = useState<PriceLine[]>(resistanceLevels);

  function handleCsvChange(raw: string) {
    setCsv(raw);
    const { candles: parsed, errors } = parseCandleCSV(raw);
    setParseErrors(errors);
    onUpdate({ csvRaw: raw, candles: parsed, supportLevels: supports, resistanceLevels: resistances });
  }

  function addLine(type: "support" | "resistance") {
    const line: PriceLine = { price: 0, label: "" };
    if (type === "support") {
      const next = [...supports, line];
      setSupports(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: next, resistanceLevels: resistances });
    } else {
      const next = [...resistances, line];
      setResistances(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: next });
    }
  }

  function updateLine(type: "support" | "resistance", index: number, field: keyof PriceLine, value: string) {
    const update = (lines: PriceLine[]) =>
      lines.map((l, i) =>
        i === index ? { ...l, [field]: field === "price" ? parseFloat(value) || 0 : value } : l
      );
    if (type === "support") {
      const next = update(supports);
      setSupports(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: next, resistanceLevels: resistances });
    } else {
      const next = update(resistances);
      setResistances(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: next });
    }
  }

  function removeLine(type: "support" | "resistance", index: number) {
    if (type === "support") {
      const next = supports.filter((_, i) => i !== index);
      setSupports(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: next, resistanceLevels: resistances });
    } else {
      const next = resistances.filter((_, i) => i !== index);
      setResistances(next);
      onUpdate({ csvRaw: csv, candles, supportLevels: supports, resistanceLevels: next });
    }
  }

  const canProceed = candles.length >= 3 && parseErrors.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 2 — נתוני גרף</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הדבק נתוני נרות בפורמט CSV: תאריך,פתיחה,גבוה,נמוך,סגירה
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">נתוני CSV</label>
        <textarea
          className="w-full min-h-32 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          dir="ltr"
          placeholder={"2024-03-01,140,148,138,145\n2024-03-02,145,152,143,150"}
          value={csv}
          onChange={(e) => handleCsvChange(e.target.value)}
        />
        {parseErrors.length > 0 && (
          <ul className="text-xs text-destructive space-y-1">
            {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {candles.length > 0 && parseErrors.length === 0 && (
          <p className="text-xs text-green-500">✓ {candles.length} נרות נטענו</p>
        )}
      </div>

      {candles.length > 0 && (
        <Card className="p-3">
          <CardContent className="px-0">
            <CandleChart
              candles={candles}
              mode="view-only"
              supportLevels={supports}
              resistanceLevels={resistances}
            />
          </CardContent>
        </Card>
      )}

      {/* Lines section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">קווי תמיכה והתנגדות</h3>

        {resistances.map((line, i) => (
          <div key={`r${i}`} className="flex gap-2 items-center">
            <span className="text-xs text-red-400 w-16">התנגדות</span>
            <input type="number" placeholder="מחיר" value={line.price || ""}
              onChange={(e) => updateLine("resistance", i, "price", e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" dir="ltr" />
            <input type="text" placeholder="תווית (אופציונלי)" value={line.label ?? ""}
              onChange={(e) => updateLine("resistance", i, "label", e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" />
            <button onClick={() => removeLine("resistance", i)}
              className="text-muted-foreground hover:text-destructive text-sm">✕</button>
          </div>
        ))}

        {supports.map((line, i) => (
          <div key={`s${i}`} className="flex gap-2 items-center">
            <span className="text-xs text-green-400 w-16">תמיכה</span>
            <input type="number" placeholder="מחיר" value={line.price || ""}
              onChange={(e) => updateLine("support", i, "price", e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" dir="ltr" />
            <input type="text" placeholder="תווית (אופציונלי)" value={line.label ?? ""}
              onChange={(e) => updateLine("support", i, "label", e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs" />
            <button onClick={() => removeLine("support", i)}
              className="text-muted-foreground hover:text-destructive text-sm">✕</button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addLine("resistance")}>
            + התנגדות
          </Button>
          <Button variant="outline" size="sm" onClick={() => addLine("support")}>
            + תמיכה
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!canProceed} className="min-h-11">המשך לשלב 3</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/exercises/_components/wizard-step-1-type.tsx app/admin/exercises/_components/wizard-step-2-data.tsx
git commit -m "feat(admin): wizard steps 1 (type) + 2 (CSV data) | שלבי האשף לסוג ונתוני גרף"
```

---

## Task 6: Admin wizard — Step 3 (zone / options) + Step 4 (question)

**Files:**
- Create: `app/admin/exercises/_components/wizard-step-3-zone.tsx`
- Create: `app/admin/exercises/_components/wizard-step-3-options.tsx`
- Create: `app/admin/exercises/_components/wizard-step-4-question.tsx`

- [ ] **Step 1: Create Step 3 zone component (chart_click)**

```typescript
// app/admin/exercises/_components/wizard-step-3-zone.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone } from "@/lib/types/exercise-types";

interface Props {
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  zone: AcceptanceZone | null;
  onZoneDraw: (zone: AcceptanceZone) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep3Zone({
  candles, supportLevels, resistanceLevels, zone, onZoneDraw, onNext, onBack,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 3 — אזור קבלה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          גרור מלבן על הגרף להגדרת אזור התשובה הנכונה. לחיצת הסטודנט בתוך המלבן = נכון.
        </p>
      </div>

      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={candles}
            mode="admin-draw"
            supportLevels={supportLevels}
            resistanceLevels={resistanceLevels}
            acceptanceZone={zone}
            onZoneDraw={onZoneDraw}
          />
        </CardContent>
      </Card>

      {zone ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-green-400">אזור קבלה מוגדר ✓</p>
          <p className="text-xs text-muted-foreground mt-1">
            מחיר: {zone.min_price.toFixed(1)} — {zone.max_price.toFixed(1)} |{" "}
            נרות: {zone.start_candle_index + 1} — {zone.end_candle_index + 1}
          </p>
          <button onClick={() => onZoneDraw({ min_price: 0, max_price: 0, start_candle_index: 0, end_candle_index: 0 })}
            className="mt-2 text-xs text-muted-foreground underline hover:text-foreground">
            גרור שוב לשינוי
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">לחץ וגרור על הגרף להגדרת האזור</p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!zone || zone.max_price === 0} className="min-h-11">
          המשך לשלב 4
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Step 3 options component (multiple_choice)**

```typescript
// app/admin/exercises/_components/wizard-step-3-options.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  candles: CandleData[];
  supportLevels: PriceLine[];
  resistanceLevels: PriceLine[];
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3 | null;
  onUpdate: (options: [string, string, string, string], correctIndex: 0 | 1 | 2 | 3) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStep3Options({
  candles, supportLevels, resistanceLevels,
  options, correctOptionIndex, onUpdate, onNext, onBack,
}: Props) {
  function setOption(i: number, value: string) {
    const next = [...options] as [string, string, string, string];
    next[i] = value;
    onUpdate(next, correctOptionIndex ?? 0);
  }

  function setCorrect(i: 0 | 1 | 2 | 3) {
    onUpdate(options, i);
  }

  const canProceed =
    options.every((o) => o.trim().length > 0) && correctOptionIndex !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold">שלב 3 — אפשרויות תשובה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          הזן 4 אפשרויות ובחר את התשובה הנכונה
        </p>
      </div>

      <Card className="p-3">
        <CardContent className="px-0">
          <CandleChart
            candles={candles}
            mode="view-only"
            supportLevels={supportLevels}
            resistanceLevels={resistanceLevels}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-3 items-center">
            <button
              onClick={() => setCorrect(i as 0 | 1 | 2 | 3)}
              className={`size-8 shrink-0 rounded-full text-sm font-bold transition-colors ${
                correctOptionIndex === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              aria-label={`סמן כתשובה נכונה`}
              title="לחץ לסימון כתשובה נכונה"
            >
              {OPTION_LABELS[i]}
            </button>
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`אפשרות ${OPTION_LABELS[i]}`}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">לחץ על האות כדי לסמן כתשובה נכונה (צבע כתום = נכון)</p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button onClick={onNext} disabled={!canProceed} className="min-h-11">המשך לשלב 4</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Step 4 component**

```typescript
// app/admin/exercises/_components/wizard-step-4-question.tsx
"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createExerciseAction, updateExerciseAction } from "@/app/admin/exercises/actions";
import type { ActionState } from "@/app/(auth)/actions";

interface LessonOption {
  id: string;
  title: string;
}

interface Props {
  title: string;
  question: string;
  explanation: string;
  lessonId: string;
  orderIndex: number;
  lessons: LessonOption[];
  contentJson: string; // serialized full exercise content
  editId?: string; // if set, we're editing an existing exercise
  onUpdate: (data: {
    title: string;
    question: string;
    explanation: string;
    lessonId: string;
    orderIndex: number;
  }) => void;
  onBack: () => void;
}

const initialState: ActionState = { status: "idle" };

export function WizardStep4Question({
  title, question, explanation, lessonId, orderIndex,
  lessons, contentJson, editId, onUpdate, onBack,
}: Props) {
  const action = editId ? updateExerciseAction : createExerciseAction;
  const [state, formAction] = useActionState(action, initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-2xl">✓</p>
        <p className="font-semibold text-lg">{editId ? "התרגיל עודכן בהצלחה" : "התרגיל נשמר בהצלחה"}</p>
        <Button asChild><a href="/admin/exercises">חזור לרשימת התרגילים</a></Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {editId && <input type="hidden" name="id" value={editId} />}
      <input type="hidden" name="content_json" value={contentJson} />

      <div>
        <h2 className="font-heading text-lg font-bold">שלב 4 — שאלה והסבר</h2>
        <p className="mt-1 text-sm text-muted-foreground">הגדר את הטקסט שהסטודנט יראה ואת המטא-נתונים</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="title">כותרת תרגיל</label>
          <input id="title" name="title" type="text" required
            defaultValue={title} onChange={(e) => onUpdate({ title: e.target.value, question, explanation, lessonId, orderIndex })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="question">שאלה</label>
          <textarea id="question" required rows={3}
            defaultValue={question} onChange={(e) => onUpdate({ title, question: e.target.value, explanation, lessonId, orderIndex })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            name="__question_display" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="explanation">הסבר (לאחר מענה)</label>
          <textarea id="explanation" required rows={3}
            defaultValue={explanation} onChange={(e) => onUpdate({ title, question, explanation: e.target.value, lessonId, orderIndex })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            name="__explanation_display" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="lesson_id">שיעור</label>
            <select id="lesson_id" name="lesson_id" required defaultValue={lessonId}
              onChange={(e) => onUpdate({ title, question, explanation, lessonId: e.target.value, orderIndex })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">בחר שיעור</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="order_index">סדר</label>
            <input id="order_index" name="order_index" type="number" min={0} required
              defaultValue={orderIndex}
              onChange={(e) => onUpdate({ title, question, explanation, lessonId, orderIndex: parseInt(e.target.value) || 0 })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              dir="ltr" />
          </div>
        </div>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} className="min-h-11">חזור</Button>
        <Button type="submit" disabled={isPending} className="min-h-11">
          {isPending ? "שומר..." : editId ? "עדכן תרגיל" : "שמור תרגיל"}
        </Button>
      </div>
    </form>
  );
}
```

**Note:** The `question` and `explanation` fields are display-only in the form (name starts with `__`). The actual values are embedded in `content_json`. The server action reads them from `content_json` — no need to send them separately.

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/exercises/_components/
git commit -m "feat(admin): wizard steps 3 (zone/options) + 4 (question/save) | שלבי האשף לאזור ושאלה"
```

---

## Task 7: Exercise wizard shell

**Files:**
- Create: `app/admin/exercises/_components/exercise-wizard.tsx`

- [ ] **Step 1: Create wizard shell**

```typescript
// app/admin/exercises/_components/exercise-wizard.tsx
"use client";

import { useState } from "react";
import { WizardStep1Type } from "./wizard-step-1-type";
import { WizardStep2Data } from "./wizard-step-2-data";
import { WizardStep3Zone } from "./wizard-step-3-zone";
import { WizardStep3Options } from "./wizard-step-3-options";
import { WizardStep4Question } from "./wizard-step-4-question";
import type { CandleData } from "@/lib/types/course-types";
import type { PriceLine, AcceptanceZone, ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";

interface LessonOption {
  id: string;
  title: string;
}

interface WizardInitialData {
  editId?: string;
  type?: "chart_click" | "multiple_choice";
  csvRaw?: string;
  candles?: CandleData[];
  supportLevels?: PriceLine[];
  resistanceLevels?: PriceLine[];
  acceptanceZone?: AcceptanceZone;
  options?: [string, string, string, string];
  correctOptionIndex?: 0 | 1 | 2 | 3;
  title?: string;
  question?: string;
  explanation?: string;
  lessonId?: string;
  orderIndex?: number;
}

interface Props {
  lessons: LessonOption[];
  initial?: WizardInitialData;
}

const STEPS = ["סוג", "נתונים", "אזור / תשובות", "שאלה"];

export function ExerciseWizard({ lessons, initial = {} }: Props) {
  const [step, setStep] = useState(initial.editId ? 1 : 0);
  const [exType, setExType] = useState<"chart_click" | "multiple_choice" | null>(initial.type ?? null);
  const [csvRaw, setCsvRaw] = useState(initial.csvRaw ?? "");
  const [candles, setCandles] = useState<CandleData[]>(initial.candles ?? []);
  const [supportLevels, setSupportLevels] = useState<PriceLine[]>(initial.supportLevels ?? []);
  const [resistanceLevels, setResistanceLevels] = useState<PriceLine[]>(initial.resistanceLevels ?? []);
  const [zone, setZone] = useState<AcceptanceZone | null>(initial.acceptanceZone ?? null);
  const [options, setOptions] = useState<[string, string, string, string]>(
    initial.options ?? ["", "", "", ""]
  );
  const [correctOptionIndex, setCorrectOptionIndex] = useState<0 | 1 | 2 | 3 | null>(
    initial.correctOptionIndex ?? null
  );
  const [title, setTitle] = useState(initial.title ?? "");
  const [question, setQuestion] = useState(initial.question ?? "");
  const [explanation, setExplanation] = useState(initial.explanation ?? "");
  const [lessonId, setLessonId] = useState(initial.lessonId ?? "");
  const [orderIndex, setOrderIndex] = useState(initial.orderIndex ?? 0);

  function buildContentJson(): string {
    if (exType === "chart_click") {
      const ex: ChartClickExercise = {
        type: "chart_click",
        question,
        candles,
        support_levels: supportLevels,
        resistance_levels: resistanceLevels,
        acceptance_zone: zone!,
        explanation,
      };
      return JSON.stringify(ex);
    } else {
      const ex: MultipleChoiceExercise = {
        type: "multiple_choice",
        question,
        candles,
        support_levels: supportLevels,
        resistance_levels: resistanceLevels,
        options,
        correct_option_index: correctOptionIndex!,
        explanation,
      };
      return JSON.stringify(ex);
    }
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step ? "bg-primary/30 text-primary" :
              i === step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 sm:w-10 ${i < step ? "bg-primary/50" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      {step === 0 && (
        <WizardStep1Type
          selected={exType}
          onSelect={setExType}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <WizardStep2Data
          csvRaw={csvRaw}
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          onUpdate={(data) => {
            setCsvRaw(data.csvRaw);
            setCandles(data.candles);
            setSupportLevels(data.supportLevels);
            setResistanceLevels(data.resistanceLevels);
          }}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && exType === "chart_click" && (
        <WizardStep3Zone
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          zone={zone}
          onZoneDraw={setZone}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 2 && exType === "multiple_choice" && (
        <WizardStep3Options
          candles={candles}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
          options={options}
          correctOptionIndex={correctOptionIndex}
          onUpdate={(opts, idx) => { setOptions(opts); setCorrectOptionIndex(idx); }}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <WizardStep4Question
          title={title}
          question={question}
          explanation={explanation}
          lessonId={lessonId}
          orderIndex={orderIndex}
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
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/exercises/_components/exercise-wizard.tsx
git commit -m "feat(admin): exercise wizard shell with 4-step state | מעטפת האשף לתרגילים"
```

---

## Task 8: Admin new/edit pages + exercises list

**Files:**
- Create: `app/admin/exercises/new/page.tsx`
- Create: `app/admin/exercises/[id]/edit/page.tsx`
- Modify: `app/admin/exercises/page.tsx`

- [ ] **Step 1: Create new exercise page**

```typescript
// app/admin/exercises/new/page.tsx
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { ExerciseWizard } from "../_components/exercise-wizard";
import type { LessonRow } from "@/lib/types/course-types";

export default async function NewExercisePage() {
  await requireAdmin();
  const db = asUntyped(await createClient());
  const { data: lessons } = await db
    .from("lessons")
    .select("id, title")
    .order("order_index") as { data: Pick<LessonRow, "id" | "title">[] | null };

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/exercises" className="hover:text-foreground transition-colors">תרגילים</Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" />
        <span className="font-medium text-foreground">תרגיל חדש</span>
      </nav>
      <h1 className="font-heading text-2xl font-bold">יצירת תרגיל חדש</h1>
      <ExerciseWizard lessons={lessons ?? []} />
    </div>
  );
}
```

- [ ] **Step 2: Create edit exercise page**

```typescript
// app/admin/exercises/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { ExerciseWizard } from "../../_components/exercise-wizard";
import { parseCandleCSV } from "@/lib/utils/parse-candle-csv";
import type { LessonRow, ExerciseRow } from "@/lib/types/course-types";
import type { ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditExercisePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const db = asUntyped(await createClient());

  const [{ data: exercise }, { data: lessons }] = await Promise.all([
    db.from("exercises").select("*").eq("id", id).single() as Promise<{ data: ExerciseRow | null }>,
    db.from("lessons").select("id, title").order("order_index") as Promise<{ data: Pick<LessonRow, "id" | "title">[] | null }>,
  ]);

  if (!exercise) notFound();

  const content = exercise.content_json as ChartClickExercise | MultipleChoiceExercise | null;

  // Re-build CSV from stored candles for display
  const csvRaw = content?.candles
    .map((c) => `${c.date},${c.open},${c.high},${c.low},${c.close}`)
    .join("\n") ?? "";

  const initial = content?.type === "chart_click" ? {
    editId: id,
    type: "chart_click" as const,
    csvRaw,
    candles: content.candles,
    supportLevels: content.support_levels,
    resistanceLevels: content.resistance_levels,
    acceptanceZone: content.acceptance_zone,
    title: exercise.title,
    question: content.question,
    explanation: content.explanation,
    lessonId: exercise.lesson_id,
    orderIndex: exercise.order_index,
  } : content?.type === "multiple_choice" ? {
    editId: id,
    type: "multiple_choice" as const,
    csvRaw,
    candles: content.candles,
    supportLevels: content.support_levels,
    resistanceLevels: content.resistance_levels,
    options: content.options,
    correctOptionIndex: content.correct_option_index,
    title: exercise.title,
    question: content.question,
    explanation: content.explanation,
    lessonId: exercise.lesson_id,
    orderIndex: exercise.order_index,
  } : { editId: id };

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/exercises" className="hover:text-foreground transition-colors">תרגילים</Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" />
        <span className="font-medium text-foreground">{exercise.title}</span>
      </nav>
      <h1 className="font-heading text-2xl font-bold">עריכת תרגיל</h1>
      <ExerciseWizard lessons={lessons ?? []} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 3: Update admin exercises list page**

Replace `app/admin/exercises/page.tsx` with a version that adds an exercises management section above the existing student progress:

```typescript
// app/admin/exercises/page.tsx
import Link from "next/link";
import { DumbbellIcon, PlusIcon, PencilIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteExerciseAction } from "./actions";
import type { Tables } from "@/lib/types/database";
import type { ExerciseRow, ExerciseSubmissionRow, LessonRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

export default async function AdminExercisesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const [
    { data: students },
    { data: exercises },
    { data: lessons },
    { data: allSubmissions },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("full_name") as unknown as Promise<{ data: Profile[] | null }>,
    db.from("exercises").select("id, title, lesson_id, order_index, content_json").order("order_index") as unknown as Promise<{ data: (Pick<ExerciseRow, "id" | "title" | "lesson_id" | "order_index"> & { content_json: { type?: string } | null })[] | null }>,
    db.from("lessons").select("id, title") as unknown as Promise<{ data: Pick<LessonRow, "id" | "title">[] | null }>,
    db.from("exercise_submissions").select("user_id, exercise_id") as unknown as Promise<{ data: Pick<ExerciseSubmissionRow, "user_id" | "exercise_id">[] | null }>,
  ]);

  const lessonMap = new Map((lessons ?? []).map((l) => [l.id, l.title]));
  const totalExercises = (exercises ?? []).length;

  const submittedByUser = new Map<string, Set<string>>();
  for (const s of allSubmissions ?? []) {
    if (!submittedByUser.has(s.user_id)) submittedByUser.set(s.user_id, new Set());
    submittedByUser.get(s.user_id)!.add(s.exercise_id);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DumbbellIcon className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-bold">תרגילים</h1>
        </div>
        <Button asChild>
          <Link href="/admin/exercises/new">
            <PlusIcon className="size-4 me-1" aria-hidden="true" />
            תרגיל חדש
          </Link>
        </Button>
      </div>

      {/* Exercise list */}
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            כל התרגילים — {totalExercises} סה&quot;כ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(exercises ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">אין תרגילים עדיין.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {(exercises ?? []).map((ex) => (
                <li key={ex.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {lessonMap.get(ex.lesson_id) ?? "—"} ·{" "}
                      <span className="text-primary">
                        {ex.content_json?.type === "chart_click" ? "לחיצה על גרף" :
                         ex.content_json?.type === "multiple_choice" ? "שאלה אמריקאית" : "ישן"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/exercises/${ex.id}/edit`}>
                        <PencilIcon className="size-4" aria-hidden="true" />
                        <span className="sr-only">ערוך</span>
                      </Link>
                    </Button>
                    <form action={deleteExerciseAction}>
                      <input type="hidden" name="id" value={ex.id} />
                      <Button variant="ghost" size="sm" type="submit"
                        className="text-destructive hover:text-destructive">
                        מחק
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Student progress (existing) */}
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            התקדמות תלמידים — {totalExercises} תרגולים סה&quot;כ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(students ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">אין תלמידים רשומים.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {(students ?? []).map((student) => {
                const done = submittedByUser.get(student.id)?.size ?? 0;
                const pct = totalExercises > 0 ? Math.round((done / totalExercises) * 100) : 0;
                return (
                  <li key={student.id}>
                    <Link href={`/admin/exercises/${student.id}`}
                      className="flex min-h-14 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{student.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{student.email}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold text-primary">{done}/{totalExercises}</p>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/exercises/new/page.tsx app/admin/exercises/[id]/edit/page.tsx app/admin/exercises/page.tsx
git commit -m "feat(admin): exercise new/edit pages + list with type badges | דפי ניהול תרגילים"
```

---

## Task 9: Extend submitExerciseAction with server-side validation

**Files:**
- Modify: `app/(student)/exercises/[id]/actions.ts`

- [ ] **Step 1: Replace the file**

```typescript
// app/(student)/exercises/[id]/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ExerciseSubmitResult, ChartClickExercise, MultipleChoiceExercise } from "@/lib/types/exercise-types";
import type { ExerciseRow } from "@/lib/types/course-types";

const submitSchema = z.object({
  exercise_id: z.string().uuid("מזהה תרגול לא תקין"),
  answer_data: z.string().min(1, "נתוני תשובה חסרים"),
});

export async function submitExerciseAction(
  _prevState: ExerciseSubmitResult,
  formData: FormData,
): Promise<ExerciseSubmitResult> {
  const supabase = asUntyped(await createClient());
  const { data: { user } } = (await supabase.auth.getUser()) as {
    data: { user: { id: string } | null };
  };
  if (!user) redirect("/login");

  const parsed = submitSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
    answer_data: formData.get("answer_data"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  let answerData: unknown;
  try {
    answerData = JSON.parse(parsed.data.answer_data);
  } catch {
    return { status: "error", error: "תשובה לא תקינה" };
  }

  // Fetch full exercise (with acceptance_zone / correct_option_index) — never exposed to client
  const { data: exercise } = (await supabase
    .from("exercises")
    .select("content_json")
    .eq("id", parsed.data.exercise_id)
    .single()) as { data: Pick<ExerciseRow, "content_json"> | null };

  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };

  const content = exercise.content_json as ChartClickExercise | MultipleChoiceExercise | null;

  // Determine correctness server-side
  let isCorrect = false;
  let explanation = "";

  if (content?.type === "chart_click") {
    const answer = answerData as { clicked_price?: number; clicked_candle_index?: number };
    const zone = content.acceptance_zone;
    isCorrect =
      typeof answer.clicked_price === "number" &&
      typeof answer.clicked_candle_index === "number" &&
      answer.clicked_price >= zone.min_price &&
      answer.clicked_price <= zone.max_price &&
      answer.clicked_candle_index >= zone.start_candle_index &&
      answer.clicked_candle_index <= zone.end_candle_index;
    explanation = content.explanation;
  } else if (content?.type === "multiple_choice") {
    const answer = answerData as { selected_option_index?: number };
    isCorrect = answer.selected_option_index === content.correct_option_index;
    explanation = content.explanation;
  }

  // Get next attempt number
  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exercise_id)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null };

  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const { error } = (await supabase
    .from("exercise_submissions")
    .insert({
      user_id: user.id,
      exercise_id: parsed.data.exercise_id,
      attempt_number: nextAttempt,
      answer_data: answerData,
    })) as { error: { message: string } | null };

  if (error) {
    console.error("[submitExerciseAction]", error);
    return { status: "error", error: "שגיאה בשמירת התשובה — נסה שנית" };
  }

  revalidatePath(`/exercises/${parsed.data.exercise_id}`);
  revalidatePath("/exercises");
  return { status: "success", correct: isCorrect, explanation };
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add app/(student)/exercises/[id]/actions.ts
git commit -m "feat(student): server-side exercise validation — chart_click + multiple_choice | אימות תשובות בשרת"
```

---

## Task 10: Update student chart-click exercise component

**Files:**
- Modify: `app/(student)/exercises/[id]/_components/chart-exercise.tsx`

- [ ] **Step 1: Replace the file to use the new action return type and chart mode**

```typescript
// app/(student)/exercises/[id]/_components/chart-exercise.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { SanitizedChartClickExercise, ChartClickAnswer, ExerciseSubmitResult } from "@/lib/types/exercise-types";

interface Props {
  exerciseId: string;
  chartData: SanitizedChartClickExercise;
  hasSubmitted: boolean;
}

export function ChartExercise({ exerciseId, chartData, hasSubmitted }: Props) {
  const [selectedPoint, setSelectedPoint] = useState<{ price: number; candleIndex: number } | null>(null);
  const [result, setResult] = useState<ExerciseSubmitResult | null>(hasSubmitted ? { status: "success" } : null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitted = result?.status === "success";

  function handlePointClick(price: number, candleIndex: number) {
    if (submitted) return;
    setSelectedPoint({ price, candleIndex });
    setError(null);
  }

  function handleSubmit() {
    if (!selectedPoint) {
      setError("יש לסמן נקודה על הגרף לפני השליחה");
      return;
    }
    const answer: ChartClickAnswer = {
      clicked_price: selectedPoint.price,
      clicked_candle_index: selectedPoint.candleIndex,
    };
    const formData = new FormData();
    formData.set("exercise_id", exerciseId);
    formData.set("answer_data", JSON.stringify(answer));

    startTransition(async () => {
      const res = await submitExerciseAction({ status: "idle" }, formData);
      setResult(res);
      if (res.status === "error") setError(res.error ?? "שגיאה — נסה שנית");
    });
  }

  function handleRetry() {
    setResult(null);
    setSelectedPoint(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="font-semibold leading-relaxed">{chartData.question}</p>
          {!submitted && (
            <p className="mt-1 text-sm text-muted-foreground">לחץ על הגרף לסימון הנקודה</p>
          )}
        </CardContent>
      </Card>

      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={chartData.candles}
            mode={submitted ? "view-only" : "student-click"}
            supportLevels={chartData.support_levels}
            resistanceLevels={chartData.resistance_levels}
            selectedPoint={submitted ? null : selectedPoint}
            onPointClick={submitted ? undefined : handlePointClick}
          />
        </CardContent>
      </Card>

      {selectedPoint && !submitted && (
        <p className="text-xs text-muted-foreground">
          נבחר: נר {selectedPoint.candleIndex + 1} | מחיר ₪{selectedPoint.price.toFixed(1)}
        </p>
      )}

      {submitted && result && (
        <Card className={result.correct ? "border-green-500/40 bg-green-500/5" : "border-orange-500/40 bg-orange-500/5"}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-start gap-2">
              {result.correct
                ? <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-green-500" />
                : <XCircleIcon className="mt-0.5 size-5 shrink-0 text-orange-500" />}
              <p className="text-sm font-medium">
                {result.correct ? "מצוין! הנקודה בתוך אזור הקבלה" : "לא בדיוק — הנקודה מחוץ לאזור הנכון"}
              </p>
            </div>
            {result.explanation && (
              <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!selectedPoint || isPending} className="w-full min-h-11 sm:w-auto">
          {isPending ? "שולח..." : "שלח תשובה"}
        </Button>
      )}

      {submitted && (
        <Button variant="outline" onClick={handleRetry} className="w-full min-h-11 sm:w-auto">
          נסה שוב
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add app/(student)/exercises/[id]/_components/chart-exercise.tsx
git commit -m "feat(student): chart-click exercise with point marker + server validation | תרגיל לחיצה על גרף"
```

---

## Task 11: New student multiple-choice exercise component

**Files:**
- Create: `app/(student)/exercises/[id]/_components/multiple-choice-exercise.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(student)/exercises/[id]/_components/multiple-choice-exercise.tsx
"use client";

import { useState, useTransition } from "react";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandleChart } from "@/components/candle-chart";
import { submitExerciseAction } from "@/app/(student)/exercises/[id]/actions";
import type { SanitizedMultipleChoiceExercise, MultipleChoiceAnswer, ExerciseSubmitResult } from "@/lib/types/exercise-types";

const OPTION_LABELS = ["א", "ב", "ג", "ד"] as const;

interface Props {
  exerciseId: string;
  chartData: SanitizedMultipleChoiceExercise;
  hasSubmitted: boolean;
}

export function MultipleChoiceExercise({ exerciseId, chartData, hasSubmitted }: Props) {
  const [selected, setSelected] = useState<0 | 1 | 2 | 3 | null>(null);
  const [result, setResult] = useState<ExerciseSubmitResult | null>(hasSubmitted ? { status: "success" } : null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitted = result?.status === "success";

  function handleSubmit() {
    if (selected === null) {
      setError("יש לבחור תשובה לפני השליחה");
      return;
    }
    const answer: MultipleChoiceAnswer = { selected_option_index: selected };
    const formData = new FormData();
    formData.set("exercise_id", exerciseId);
    formData.set("answer_data", JSON.stringify(answer));

    startTransition(async () => {
      const res = await submitExerciseAction({ status: "idle" }, formData);
      setResult(res);
      if (res.status === "error") setError(res.error ?? "שגיאה — נסה שנית");
    });
  }

  function handleRetry() {
    setResult(null);
    setSelected(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="font-semibold leading-relaxed">{chartData.question}</p>
        </CardContent>
      </Card>

      <Card className="p-3 sm:p-4">
        <CardContent className="px-0">
          <CandleChart
            candles={chartData.candles}
            mode="view-only"
            supportLevels={chartData.support_levels}
            resistanceLevels={chartData.resistance_levels}
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {chartData.options.map((option, i) => {
          const idx = i as 0 | 1 | 2 | 3;
          const isSelected = selected === idx;
          return (
            <button
              key={i}
              onClick={() => { if (!submitted) { setSelected(idx); setError(null); } }}
              disabled={submitted}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              } ${submitted ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`size-7 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {OPTION_LABELS[i]}
              </span>
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>

      {submitted && result && (
        <Card className={result.correct ? "border-green-500/40 bg-green-500/5" : "border-orange-500/40 bg-orange-500/5"}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-start gap-2">
              {result.correct
                ? <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-green-500" />
                : <XCircleIcon className="mt-0.5 size-5 shrink-0 text-orange-500" />}
              <p className="text-sm font-medium">
                {result.correct ? "נכון מאוד!" : "לא בדיוק"}
              </p>
            </div>
            {result.explanation && (
              <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={selected === null || isPending} className="w-full min-h-11 sm:w-auto">
          {isPending ? "שולח..." : "שלח תשובה"}
        </Button>
      )}

      {submitted && (
        <Button variant="outline" onClick={handleRetry} className="w-full min-h-11 sm:w-auto">
          נסה שוב
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
pnpm build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add app/(student)/exercises/[id]/_components/multiple-choice-exercise.tsx
git commit -m "feat(student): multiple-choice exercise component א/ב/ג/ד | תרגיל שאלה אמריקאית"
```

---

## Task 12: Update student exercise page — route by type + sanitize

**Files:**
- Modify: `app/(student)/exercises/[id]/page.tsx`

- [ ] **Step 1: Replace the exercise page**

```typescript
// app/(student)/exercises/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import { requirePageAccess } from "@/lib/auth/check-page-access";
import { Card, CardContent } from "@/components/ui/card";
import { ChartExercise } from "./_components/chart-exercise";
import { MultipleChoiceExercise } from "./_components/multiple-choice-exercise";
import { SubmitExerciseButton } from "./_components/submit-exercise-button";
import type {
  ExerciseContent,
  SanitizedChartClickExercise,
  SanitizedMultipleChoiceExercise,
} from "@/lib/types/exercise-types";
import type { ExerciseRow, LessonRow, LessonProgressRow, ExerciseSubmissionRow } from "@/lib/types/course-types";

// Strip sensitive fields before passing to client components
function sanitize(content: ExerciseContent): SanitizedChartClickExercise | SanitizedMultipleChoiceExercise | null {
  if (content.type === "chart_click") {
    const { acceptance_zone: _z, ...safe } = content;
    return safe;
  }
  if (content.type === "multiple_choice") {
    const { correct_option_index: _c, ...safe } = content;
    return safe;
  }
  return null; // legacy type handled separately below
}

interface ExercisePageProps {
  params: Promise<{ id: string }>;
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  await requirePageAccess("exercises");
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const db = asUntyped(supabase);

  const { data: exercise } = (await db
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single()) as { data: ExerciseRow | null };

  if (!exercise) notFound();

  const { data: lesson } = (await db
    .from("lessons")
    .select("id, title")
    .eq("id", exercise.lesson_id)
    .single()) as { data: Pick<LessonRow, "id" | "title"> | null };

  const { data: progress } = (await db
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", exercise.lesson_id)
    .maybeSingle()) as { data: Pick<LessonProgressRow, "completed_at"> | null };

  if (!progress?.completed_at) notFound();

  const { data: submissions } = (await db
    .from("exercise_submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("exercise_id", id)
    .limit(1)) as { data: Pick<ExerciseSubmissionRow, "id">[] | null };

  const hasSubmitted = (submissions ?? []).length > 0;
  const content = exercise.content_json as ExerciseContent | null;

  return (
    <div className="space-y-6">
      <nav aria-label="ניווט נתיב" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/exercises" className="transition-colors hover:text-foreground">תרגולי שיעורים</Link>
        <ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        <span className="font-medium text-foreground">{exercise.title}</span>
      </nav>

      <div>
        <h1 className="font-heading text-2xl font-bold">{exercise.title}</h1>
        {lesson && <p className="mt-1 text-sm text-muted-foreground">שיעור: {lesson.title}</p>}
      </div>

      {exercise.description && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed">{exercise.description}</p>
          </CardContent>
        </Card>
      )}

      {content?.type === "chart_click" && (() => {
        const safe = sanitize(content) as SanitizedChartClickExercise;
        return <ChartExercise exerciseId={id} chartData={safe} hasSubmitted={hasSubmitted} />;
      })()}

      {content?.type === "multiple_choice" && (() => {
        const safe = sanitize(content) as SanitizedMultipleChoiceExercise;
        return <MultipleChoiceExercise exerciseId={id} chartData={safe} hasSubmitted={hasSubmitted} />;
      })()}

      {content?.type === "candle_chart_select" && (
        // Legacy exercise type — kept working with old ChartExercise via SubmitExerciseButton
        <SubmitExerciseButton exerciseId={id} hasSubmitted={hasSubmitted} />
      )}

      {!content && (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center pt-6">
            <p className="text-sm text-muted-foreground">תרגיל זה אינו זמין כרגע</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Full build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: clean build, zero TypeScript errors.

- [ ] **Step 3: Push to GitHub**

```bash
git add app/(student)/exercises/[id]/page.tsx
git commit -m "feat(student): route exercises by type + sanitize sensitive fields | ניתוב לפי סוג תרגיל"
git push origin main
```

---

## Task 13: End-to-end smoke test

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Admin — create a chart_click exercise**
  1. Go to `/admin/exercises` → click "תרגיל חדש"
  2. Select "לחיצה על גרף" → Next
  3. Paste: `2024-03-01,140,148,138,145\n2024-03-02,145,152,143,150\n2024-03-03,150,156,142,148\n2024-03-04,148,150,140,143\n2024-03-05,143,155,141,153`
  4. Add a resistance line at 150 labelled "התנגדות ראשית"
  5. Draw acceptance zone over candles 4–5 around price 148–155
  6. Enter question: "סמן את נקודת הפריצה מעל ההתנגדות", explanation: "הפריצה התרחשה בנר החמישי"
  7. Select any lesson, order 99, save → verify success screen and exercise appears in list

- [ ] **Step 3: Admin — create a multiple_choice exercise**
  1. Repeat step 2 flow with "שאלה אמריקאית"
  2. Enter 4 Hebrew options, mark option א as correct
  3. Save → verify in list

- [ ] **Step 4: Student — submit correct chart_click answer**
  1. Login as student, complete the parent lesson
  2. Go to the new chart_click exercise
  3. Click inside the acceptance zone area → verify orange marker appears + price readout
  4. Submit → verify green "נכון" banner + explanation

- [ ] **Step 5: Student — submit incorrect answer**
  1. Click clearly outside the zone
  2. Submit → verify orange "לא בדיוק" banner + explanation

- [ ] **Step 6: Student — submit multiple_choice**
  1. Go to the MC exercise
  2. Select option א → submit → verify green feedback
  3. Click "נסה שוב" → select wrong option → submit → verify orange feedback

- [ ] **Step 7: Verify legacy exercise still works**
  1. Go to the Lesson 4 exercise (existing `candle_chart_select`)
  2. Verify it still renders and submits correctly

- [ ] **Step 8: Commit push after smoke test passes**

```bash
git push origin main
```
