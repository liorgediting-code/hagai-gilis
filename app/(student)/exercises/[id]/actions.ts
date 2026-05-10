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

  // Re-fetch full exercise to get sensitive fields — never trust client
  const { data: exercise } = (await supabase
    .from("exercises")
    .select("content_json")
    .eq("id", parsed.data.exercise_id)
    .single()) as { data: Pick<ExerciseRow, "content_json"> | null };

  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };

  const content = exercise.content_json as ChartClickExercise | MultipleChoiceExercise | null;

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
    isCorrect =
      typeof answer.selected_option_index === "number" &&
      answer.selected_option_index === content.correct_option_index;
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
