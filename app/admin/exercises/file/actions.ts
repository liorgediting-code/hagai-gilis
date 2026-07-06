"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import { fileUploadSchema } from "@/lib/types/exercise-types";

const metaSchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
});

function buildContent(formData: FormData):
  | { ok: true; data: z.infer<typeof fileUploadSchema> }
  | { ok: false; error: string } {
  const parsed = fileUploadSchema.safeParse({
    type: "file_upload",
    instructions: formData.get("instructions"),
    required_files: formData.get("required_files"),
    completion_mode: formData.get("completion_mode"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? "תוכן לא תקין" };
  return { ok: true, data: parsed.data };
}

export async function createFileExerciseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const meta = metaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    order_index: formData.get("order_index"),
  });
  if (!meta.success) return { status: "error", error: meta.error.errors[0]?.message ?? "קלט לא תקין" };

  const content = buildContent(formData);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").insert({
    lesson_id: meta.data.lesson_id,
    title: meta.data.title,
    level: 1,
    description: null,
    order_index: meta.data.order_index,
    content_json: content.data,
  });
  if (error) return { status: "error", error: "שגיאה ביצירת התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  return { status: "success" };
}

export async function updateFileExerciseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה תרגיל חסר" };

  const meta = metaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    order_index: formData.get("order_index"),
  });
  if (!meta.success) return { status: "error", error: meta.error.errors[0]?.message ?? "קלט לא תקין" };

  const content = buildContent(formData);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").update({
    lesson_id: meta.data.lesson_id,
    title: meta.data.title,
    order_index: meta.data.order_index,
    content_json: content.data,
  }).eq("id", id);
  if (error) return { status: "error", error: "שגיאה בעדכון התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  return { status: "success" };
}
