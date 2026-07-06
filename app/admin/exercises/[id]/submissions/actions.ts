"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const schema = z.object({
  submission_id: z.string().uuid("מזהה הגשה לא תקין"),
  exercise_id: z.string().uuid().optional(),
  passed: z.enum(["true", "false"]),
});

export async function reviewFileSubmissionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    submission_id: formData.get("submission_id"),
    exercise_id: formData.get("exercise_id") || undefined,
    passed: formData.get("passed"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("exercise_submissions")
    .update({ passed: parsed.data.passed === "true" })
    .eq("id", parsed.data.submission_id)) as { data: null; error: unknown };
  if (error) return { status: "error", error: "שגיאה בעדכון ההגשה — נסה שנית" };

  if (parsed.data.exercise_id) revalidatePath(`/admin/exercises/${parsed.data.exercise_id}/submissions`);
  revalidatePath("/admin/students");
  revalidatePath("/lessons");
  return { status: "success" };
}
