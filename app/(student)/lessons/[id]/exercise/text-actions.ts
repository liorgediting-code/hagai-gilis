"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ExerciseRow } from "@/lib/types/course-types";
import type { TextAnswerExercise } from "@/lib/types/exercise-types";

export type TextSubmitResult = { status: "idle" | "success" | "error"; error?: string; passed?: boolean };

export async function submitTextAnswerAction(formData: FormData): Promise<TextSubmitResult> {
  const supabase = asUntyped(await createClient());
  const { data: { user } } = (await supabase.auth.getUser()) as { data: { user: { id: string } | null } };
  if (!user) return { status: "error", error: "לא מחובר" };

  const exerciseId = formData.get("exercise_id");
  const lessonId = formData.get("lesson_id");
  const uuid = z.string().uuid();
  if (typeof exerciseId !== "string" || !uuid.safeParse(exerciseId).success ||
      typeof lessonId !== "string" || !uuid.safeParse(lessonId).success) {
    return { status: "error", error: "מזהה לא תקין" };
  }

  // Re-fetch exercise server-side — never trust client content.
  const { data: exercise } = (await supabase
    .from("exercises")
    .select("id, lesson_id, content_json")
    .eq("id", exerciseId)
    .single()) as { data: Pick<ExerciseRow, "id" | "lesson_id" | "content_json"> | null };
  if (!exercise) return { status: "error", error: "תרגיל לא נמצא" };
  if (exercise.lesson_id !== lessonId) return { status: "error", error: "תרגיל לא שייך לשיעור זה" };

  const content = exercise.content_json as TextAnswerExercise | null;
  if (!content || content.type !== "text_answer") return { status: "error", error: "סוג תרגיל שגוי" };

  const text = formData.get("text");
  if (typeof text !== "string" || text.trim().length === 0) {
    return { status: "error", error: "נדרש לכתוב תשובה" };
  }

  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null };
  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const passed = content.completion_mode === "auto_complete" ? true : null;

  const { error: insErr } = (await supabase.from("exercise_submissions").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    attempt_number: nextAttempt,
    answer_data: { text: text.trim() },
    passed,
    score_pct: null,
  })) as { error: unknown };
  if (insErr) return { status: "error", error: "שגיאה בשמירת ההגשה — נסה שנית" };

  revalidatePath(`/lessons/${lessonId}`);
  return { status: "success", passed: passed === true };
}
