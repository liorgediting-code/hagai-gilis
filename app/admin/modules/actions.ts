"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import type { ModuleRow } from "@/lib/types/course-types";

const moduleSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(1000, "תיאור ארוך מדי").optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
});

export async function createModuleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("modules")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      order_index: parsed.data.order_index,
    })) as { data: ModuleRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה ביצירת המודול — נסה שנית" };
  }

  revalidatePath("/admin/modules");
  return { status: "success" };
}

export async function updateModuleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה מודול חסר" };
  }

  const parsed = moduleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("modules")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      order_index: parsed.data.order_index,
    })
    .eq("id", id)) as { data: ModuleRow | null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בעדכון המודול — נסה שנית" };
  }

  revalidatePath("/admin/modules");
  return { status: "success" };
}

export async function deleteModuleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", error: "מזהה מודול חסר" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("modules")
    .delete()
    .eq("id", id)) as { data: null; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה במחיקת המודול — נסה שנית" };
  }

  revalidatePath("/admin/modules");
  return { status: "success" };
}
