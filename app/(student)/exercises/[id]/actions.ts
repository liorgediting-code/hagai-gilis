"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ActionState } from "@/app/(auth)/actions";

const submitSchema = z.object({
  exercise_id: z.string().uuid("מזהה תרגול לא תקין"),
  answer_data: z.string().optional(),
});

export async function submitExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Single client instance — auth + query share the same session token
  const supabase = asUntyped(await createClient());
  const { data: { user } } = (await supabase.auth.getUser()) as {
    data: { user: { id: string } | null };
  };
  if (!user) redirect("/login");

  const parsed = submitSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
    answer_data: formData.get("answer_data") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const { data: existing } = (await supabase
    .from("exercise_submissions")
    .select("attempt_number")
    .eq("user_id", user.id)
    .eq("exercise_id", parsed.data.exercise_id)
    .order("attempt_number", { ascending: false })
    .limit(1)) as { data: { attempt_number: number }[] | null; error: unknown };

  const nextAttempt = (existing?.[0]?.attempt_number ?? 0) + 1;

  const { error } = (await supabase
    .from("exercise_submissions")
    .insert({
      user_id: user.id,
      exercise_id: parsed.data.exercise_id,
      attempt_number: nextAttempt,
      answer_data: parsed.data.answer_data ? JSON.parse(parsed.data.answer_data) : null,
    })) as { data: unknown; error: { message: string } | null };

  if (error) {
    console.error("[submitExerciseAction]", error);
    return { status: "error", error: "שגיאה בשמירת התשובה — נסה שנית" };
  }

  revalidatePath(`/exercises/${parsed.data.exercise_id}`);
  revalidatePath("/exercises");
  return { status: "success" };
}
