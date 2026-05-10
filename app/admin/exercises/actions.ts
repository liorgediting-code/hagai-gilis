"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import { exerciseContentSchema } from "@/lib/types/exercise-types";

const exerciseMetaSchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(2000).optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
  content_json: z.string().min(1, "תוכן תרגיל נדרש"),
});

function parseAndValidateContent(
  raw: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "תוכן התרגיל אינו JSON תקין" };
  }
  const result = exerciseContentSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.errors[0]?.message ?? "תוכן תרגיל לא תקין",
    };
  }
  return { ok: true, data: result.data };
}

export async function createExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = exerciseMetaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
    content_json: formData.get("content_json"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const content = parseAndValidateContent(parsed.data.content_json);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").insert({
    lesson_id: parsed.data.lesson_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
    content_json: content.data,
  });

  if (error) return { status: "error", error: "שגיאה ביצירת התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
  return { status: "success" };
}

export async function updateExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה תרגיל חסר" };
  }

  const parsed = exerciseMetaSchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
    content_json: formData.get("content_json"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const content = parseAndValidateContent(parsed.data.content_json);
  if (!content.ok) return { status: "error", error: content.error };

  const supabase = asUntyped(await createClient());
  const { error } = await supabase
    .from("exercises")
    .update({
      lesson_id: parsed.data.lesson_id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      order_index: parsed.data.order_index,
      content_json: content.data,
    })
    .eq("id", id);

  if (error) return { status: "error", error: "שגיאה בעדכון התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  revalidatePath(`/exercises/${id}`);
  return { status: "success" };
}

export async function deleteExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה תרגיל חסר" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = await supabase.from("exercises").delete().eq("id", id);

  if (error) return { status: "error", error: "שגיאה במחיקת התרגיל — נסה שנית" };

  revalidatePath("/admin/exercises");
  revalidatePath("/exercises");
  return { status: "success" };
}

export async function deleteExerciseFormAction(formData: FormData): Promise<void> {
  await deleteExerciseAction({ status: "idle" }, formData);
}
