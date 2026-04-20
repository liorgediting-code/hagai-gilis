"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "@/lib/auth/require-user";
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
  const user = await requireUser();

  const parsed = progressSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    last_position_seconds: formData.get("last_position_seconds") ?? 0,
    completed: formData.get("completed") === "true",
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lesson_progress")
    .upsert({
      user_id: user.id,
      lesson_id: parsed.data.lesson_id,
      last_position_seconds: parsed.data.last_position_seconds,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    })) as { data: unknown; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בשמירת ההתקדמות — נסה שנית" };
  }

  revalidatePath(`/lessons/${parsed.data.lesson_id}`);
  revalidatePath("/lessons");
  return { status: "success" };
}
