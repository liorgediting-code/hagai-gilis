"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import type { LessonRow } from "@/lib/types/course-types";

const lessonSchema = z.object({
  module_id: z.string().uuid("מזהה מודול לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(2000, "תיאור ארוך מדי").optional(),
  video_url: z.string().url("כתובת URL לא תקינה").optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
});

export async function createLessonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const rawVideoUrl = formData.get("video_url");
  const parsed = lessonSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    video_url: rawVideoUrl && String(rawVideoUrl).trim() !== "" ? rawVideoUrl : undefined,
    order_index: formData.get("order_index"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lessons")
    .insert({
      module_id: parsed.data.module_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      video_url: parsed.data.video_url ?? null,
      order_index: parsed.data.order_index,
    })) as { data: LessonRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה ביצירת השיעור — נסה שנית" };
  }

  revalidatePath(`/admin/modules/${parsed.data.module_id}/lessons`);
  return { status: "success" };
}

export async function updateLessonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה שיעור חסר" };
  }

  const rawVideoUrl = formData.get("video_url");
  const parsed = lessonSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    video_url: rawVideoUrl && String(rawVideoUrl).trim() !== "" ? rawVideoUrl : undefined,
    order_index: formData.get("order_index"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lessons")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      video_url: parsed.data.video_url ?? null,
      order_index: parsed.data.order_index,
    })
    .eq("id", id)) as { data: LessonRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בעדכון השיעור — נסה שנית" };
  }

  revalidatePath(`/admin/modules/${parsed.data.module_id}/lessons`);
  return { status: "success" };
}

export async function deleteLessonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const moduleId = formData.get("module_id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה שיעור חסר" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lessons")
    .delete()
    .eq("id", id)) as { data: null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה במחיקת השיעור — נסה שנית" };
  }

  if (typeof moduleId === "string" && moduleId) {
    revalidatePath(`/admin/modules/${moduleId}/lessons`);
  }
  revalidatePath("/admin/modules");
  return { status: "success" };
}
