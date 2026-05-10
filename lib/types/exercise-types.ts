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
