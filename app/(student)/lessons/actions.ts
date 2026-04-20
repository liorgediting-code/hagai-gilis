"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { ActionState } from "@/app/(auth)/actions";

const progressSchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  last_position_seconds: z.coerce.number().int().min(0, "מיקום לא תקין"),
  completed: z.boolean(),
});

export async function saveLessonProgressAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Single client instance — auth + query share the same session token
  const supabase = asUntyped(await createClient());
  const { data: { user } } = (await supabase.auth.getUser()) as {
    data: { user: { id: string } | null };
  };
  if (!user) redirect("/login");

  const parsed = progressSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    last_position_seconds: formData.get("last_position_seconds") ?? 0,
    completed: formData.get("completed") === "true",
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const { error } = (await supabase
    .from("lesson_progress")
    .upsert(
      {
        user_id: user.id,
        lesson_id: parsed.data.lesson_id,
        last_position_seconds: parsed.data.last_position_seconds,
        completed_at: parsed.data.completed ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    )) as { data: unknown; error: { message: string } | null };

  if (error) {
    console.error("[saveLessonProgressAction]", error);
    return { status: "error", error: `DB error: ${error.message}` };
  }

  revalidatePath(`/lessons/${parsed.data.lesson_id}`);
  revalidatePath("/lessons");
  return { status: "success" };
}
