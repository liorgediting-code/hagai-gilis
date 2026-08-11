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

export type FileUploadExercise = {
  type: "file_upload";
  instructions: string;
  /** Maximum number of files the student may upload (1..10). */
  max_files: number;
  /** @deprecated legacy fixed count — read via getMaxFiles(); migrated to max_files. */
  required_files?: number;
  completion_mode: "manual_review" | "auto_complete";
  /** When true, the student may (optionally) leave a text note alongside their upload. */
  allow_text_answer?: boolean;
  /** Admin-authored label shown to the student for the optional text note. Required when allow_text_answer is true. */
  text_prompt?: string;
};

/** Backward-compatible read of the file cap, tolerating rows written before max_files. */
export function getMaxFiles(content: Pick<FileUploadExercise, "max_files" | "required_files">): number {
  return content.max_files ?? content.required_files ?? 1;
}

export type UploadedFile = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

export type FileUploadAnswer = {
  files: UploadedFile[];
  /** Optional student-authored note, present only if they wrote one. */
  text_note?: string;
};

export type SanitizedChartClickExercise = Omit<ChartClickExercise, "acceptance_zone">;

export type SanitizedMultipleChoiceQuestion = Omit<MultipleChoiceQuestion, "correct_option_index" | "explanation">;
export type SanitizedMultipleChoiceExercise = Omit<MultipleChoiceExercise, "questions"> & {
  questions: SanitizedMultipleChoiceQuestion[];
};

export type ExerciseContent =
  | ChartClickExercise
  | MultipleChoiceExercise
  | FileUploadExercise
  | { type: "candle_chart_select"; [key: string]: unknown };

export type SanitizedExerciseContent =
  | SanitizedChartClickExercise
  | SanitizedMultipleChoiceExercise
  | FileUploadExercise
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

const fileUploadBaseSchema = z.object({
  type: z.literal("file_upload"),
  instructions: z.string().min(1, "הוראות נדרשות").max(4000, "הוראות ארוכות מדי"),
  max_files: z.coerce.number().int().min(1, "נדרש לפחות קובץ אחד").max(10, "עד 10 קבצים"),
  completion_mode: z.enum(["manual_review", "auto_complete"]),
  allow_text_answer: z.boolean().default(false),
  text_prompt: z.string().max(200, "טקסט ההנחיה ארוך מדי").optional(),
});

export const fileUploadSchema = fileUploadBaseSchema.refine(
  (data) => !data.allow_text_answer || (data.text_prompt !== undefined && data.text_prompt.trim().length > 0),
  { message: "טקסט הנחיה נדרש כאשר הערת טקסט מופעלת", path: ["text_prompt"] },
);

export const uploadedFileSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().min(0),
});

export const fileUploadAnswerSchema = z.object({
  files: z.array(uploadedFileSchema).min(1, "נדרש להעלות לפחות קובץ אחד"),
  text_note: z.string().max(2000, "ההערה ארוכה מדי").optional(),
});

export const exerciseContentSchema = z.discriminatedUnion("type", [
  chartClickSchema,
  multipleChoiceSchema,
  fileUploadBaseSchema,
]).superRefine((data, ctx) => {
  if (data.type === "file_upload" && data.allow_text_answer && !data.text_prompt?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "טקסט הנחיה נדרש כאשר הערת טקסט מופעלת",
      path: ["text_prompt"],
    });
  }
});
