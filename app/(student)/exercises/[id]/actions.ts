"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
import type { ActionState } from "@/app/(auth)/actions";
import type { ExerciseSubmissionRow } from "@/lib/types/course-types";

const submitSchema = z.object({
  exercise_id: z.string().uuid("מזהה תרגול לא תקין"),
});

export async function submitExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = submitSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());

  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exercise_id)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: Pick<ExerciseSubmissionRow, "attempt_number">[] | null; error: unknown };

  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const { error } = (await supabase
    .from("exercise_submissions")
    .insert({
      user_id: user.id,
      exercise_id: parsed.data.exercise_id,
      attempt_number: nextAttempt,
      answer_data: null,
    })) as { data: unknown; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בשמירת התשובה — נסה שנית" };
  }

  revalidatePath(`/exercises/${parsed.data.exercise_id}`);
  revalidatePath("/exercises");
  return { status: "success" };
}
