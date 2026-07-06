"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { createAdminClient } from "@/lib/supabase/admin";
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

const deleteStudentSchema = z.object({
  user_id: z.string().uuid(),
});

export async function deleteStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user: adminUser } = await requireAdmin();

  const parsed = deleteStudentSchema.safeParse({
    user_id: formData.get("user_id"),
  });
  if (!parsed.success) return { status: "error", error: "קלט לא תקין" };

  const targetId = parsed.data.user_id;

  if (targetId === adminUser.id) {
    return { status: "error", error: "לא ניתן למחוק את החשבון שלך" };
  }

  const admin = createAdminClient();

  const { data: target } = (await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .single()) as { data: { role: string } | null };

  if (!target) return { status: "error", error: "התלמיד לא נמצא" };
  if (target.role === "admin") {
    return { status: "error", error: "לא ניתן למחוק חשבון מנהל" };
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    console.error(`deleteStudentAction failed: admin=${adminUser.id} target=${targetId}`, error);
    return { status: "error", error: "שגיאה במחיקת התלמיד — נסה שנית" };
  }

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
