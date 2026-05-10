"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const unlockSchema = z.object({
  user_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
});

export async function unlockLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user: adminUser } = await requireAdmin();

  const parsed = unlockSchema.safeParse({
    user_id: formData.get("user_id"),
    lesson_id: formData.get("lesson_id"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("lesson_unlocks").upsert(
    {
      user_id: parsed.data.user_id,
      lesson_id: parsed.data.lesson_id,
      unlocked_by: adminUser.id,
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) return { status: "error", error: "שגיאה בפתיחת השיעור" };

  revalidatePath(`/admin/students/${parsed.data.user_id}`);
  return { status: "success" };
}

export async function lockLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = unlockSchema.safeParse({
    user_id: formData.get("user_id"),
    lesson_id: formData.get("lesson_id"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase
    .from("lesson_unlocks")
    .delete()
    .eq("user_id", parsed.data.user_id)
    .eq("lesson_id", parsed.data.lesson_id);

  if (error) return { status: "error", error: "שגיאה בנעילת השיעור" };

  revalidatePath(`/admin/students/${parsed.data.user_id}`);
  return { status: "success" };
}
