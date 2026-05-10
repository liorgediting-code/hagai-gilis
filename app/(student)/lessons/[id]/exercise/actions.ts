"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import {
  chartClickSchema,
  multipleChoiceSchema,
  type ExerciseSubmitResult,
  type ChartClickAnswer,
  type MultipleChoiceAnswer,
  type ChartClickExercise,
  type MultipleChoiceExercise,
} from "@/lib/types/exercise-types";
import type { ExerciseRow, LessonRow } from "@/lib/types/course-types";

const chartClickAnswerSchema = z.object({
  clicked_price: z.number(),
  clicked_candle_index: z.number().int().min(0),
});

const multipleChoiceAnswerSchema = z.object({
  selected_option_indices: z
    .array(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
    .min(1),
});

export async function submitExerciseAttempt(
  lessonId: string,
  exerciseId: string,
  answer: ChartClickAnswer | MultipleChoiceAnswer,
): Promise<ExerciseSubmitResult> {
  const supabase = asUntyped(await createClient());

  const {
    data: { user },
  } = (await supabase.auth.getUser()) as {
    data: { user: { id: string } | null };
  };
  if (!user) return { status: "error", error: "לא מחובר" };

  // Validate lessonId and exerciseId are UUIDs
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(lessonId).success || !uuidSchema.safeParse(exerciseId).success) {
    return { status: "error", error: "מזהה לא תקין" };
  }

  // Re-fetch exercise server-side — never trust client content
  const { data: exercise } = (await supabase
    .from("exercises")
    .select("id, lesson_id, level, content_json")
    .eq("id", exerciseId)
    .single()) as { data: Pick<ExerciseRow, "id" | "lesson_id" | "level" | "content_json"> | null };

  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };

  // Security: verify this exercise belongs to the stated lesson
  if (exercise.lesson_id !== lessonId) {
    return { status: "error", error: "תרגיל לא שייך לשיעור זה" };
  }

  // Parse content_json with strict schema
  const contentRaw = exercise.content_json;
  const contentUnion = z.discriminatedUnion("type", [chartClickSchema, multipleChoiceSchema]);
  const contentParsed = contentUnion.safeParse(contentRaw);
  if (!contentParsed.success) {
    return { status: "error", error: "תוכן תרגיל לא תקין" };
  }
  const content = contentParsed.data;

  // Fetch lesson for pass_threshold
  const { data: lesson } = (await supabase
    .from("lessons")
    .select("pass_threshold")
    .eq("id", lessonId)
    .single()) as { data: Pick<LessonRow, "pass_threshold"> | null };

  if (!lesson) return { status: "error", error: "שיעור לא נמצא" };

  // Grade the answer
  let passed = false;
  let score_pct = 0;
  let explanation: string | undefined;
  let question_results: ExerciseSubmitResult["question_results"];

  if (content.type === "chart_click") {
    const parsed = chartClickAnswerSchema.safeParse(answer);
    if (!parsed.success) return { status: "error", error: "תשובה לא תקינה" };

    const typedContent = content as ChartClickExercise;
    const zone = typedContent.acceptance_zone;
    const a = parsed.data;
    passed =
      a.clicked_price >= zone.min_price &&
      a.clicked_price <= zone.max_price &&
      a.clicked_candle_index >= zone.start_candle_index &&
      a.clicked_candle_index <= zone.end_candle_index;
    score_pct = passed ? 100 : 0;
    explanation = typedContent.explanation;
  } else if (content.type === "multiple_choice") {
    const parsed = multipleChoiceAnswerSchema.safeParse(answer);
    if (!parsed.success) return { status: "error", error: "תשובה לא תקינה" };

    const typedContent = content as MultipleChoiceExercise;
    const questions = typedContent.questions;
    const selectedIndices = parsed.data.selected_option_indices;

    const correctCount = questions.reduce((count, q, i) => {
      return selectedIndices[i] === q.correct_option_index ? count + 1 : count;
    }, 0);

    score_pct = Math.round((correctCount / questions.length) * 100);
    passed = score_pct >= lesson.pass_threshold;

    question_results = questions.map((q, i) => ({
      correct: selectedIndices[i] === q.correct_option_index,
      explanation: q.explanation,
      correct_option_index: q.correct_option_index,
    }));
  }

  // Determine next attempt number for this user+exercise
  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null };

  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const { error: insertError } = (await supabase
    .from("exercise_submissions")
    .insert({
      user_id: user.id,
      exercise_id: exerciseId,
      attempt_number: nextAttempt,
      answer_data: answer,
      passed,
      score_pct,
    })) as { error: { message: string } | null };

  if (insertError) {
    console.error("[submitExerciseAttempt]", insertError);
    return { status: "error", error: "שגיאה בשמירת התשובה — נסה שנית" };
  }

  revalidatePath(`/lessons/${lessonId}/exercise`);

  return {
    status: "success",
    passed,
    score_pct,
    level: exercise.level,
    explanation,
    question_results,
  };
}
