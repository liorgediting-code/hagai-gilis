"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseYouTubeEmbedUrl } from "@/lib/utils/youtube";
import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import type { LessonRow } from "@/lib/types/course-types";

const lessonSchema = z.object({
  unit_id: z.string().uuid("מזהה יחידה לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(2000, "תיאור ארוך מדי").optional(),
  video_url: z.string().url("כתובת URL לא תקינה").optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
  pass_threshold: z.coerce.number().int().min(0, "סף מעבר חייב להיות לפחות 0").max(100, "סף מעבר לא יכול להיות יותר מ-100").default(70),
});

export async function createLessonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const rawVideoUrl = formData.get("video_url");
  const parsed = lessonSchema.safeParse({
    unit_id: formData.get("unit_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    video_url: rawVideoUrl && String(rawVideoUrl).trim() !== "" ? rawVideoUrl : undefined,
    order_index: formData.get("order_index"),
    pass_threshold: formData.get("pass_threshold"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  let videoUrl: string | null = null;
  if (parsed.data.video_url) {
    try {
      videoUrl = parseYouTubeEmbedUrl(parsed.data.video_url);
    } catch {
      return { status: "error", error: "כתובת YouTube לא תקינה — השתמש בכתובת embed או watch" };
    }
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lessons")
    .insert({
      unit_id: parsed.data.unit_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      video_url: videoUrl,
      order_index: parsed.data.order_index,
      pass_threshold: parsed.data.pass_threshold,
    })) as { data: LessonRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה ביצירת השיעור — נסה שנית" };
  }

  revalidatePath(`/admin/units/${parsed.data.unit_id}/lessons`);
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
    unit_id: formData.get("unit_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    video_url: rawVideoUrl && String(rawVideoUrl).trim() !== "" ? rawVideoUrl : undefined,
    order_index: formData.get("order_index"),
    pass_threshold: formData.get("pass_threshold"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  let videoUrl: string | null = null;
  if (parsed.data.video_url) {
    try {
      videoUrl = parseYouTubeEmbedUrl(parsed.data.video_url);
    } catch {
      return { status: "error", error: "כתובת YouTube לא תקינה — השתמש בכתובת embed או watch" };
    }
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lessons")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      video_url: videoUrl,
      order_index: parsed.data.order_index,
      pass_threshold: parsed.data.pass_threshold,
    })
    .eq("id", id)) as { data: LessonRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בעדכון השיעור — נסה שנית" };
  }

  revalidatePath(`/admin/units/${parsed.data.unit_id}/lessons`);
  return { status: "success" };
}

export async function deleteLessonAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  const unitId = formData.get("unit_id");
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

  if (typeof unitId === "string" && unitId) {
    revalidatePath(`/admin/units/${unitId}/lessons`);
  }
  revalidatePath("/admin/modules");
  return { status: "success" };
}
