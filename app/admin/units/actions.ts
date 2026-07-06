"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";
import type { UnitRow } from "@/lib/types/course-types";

const unitSchema = z.object({
  module_id: z.string().uuid("מזהה נושא לא תקין"),
  title: z.string().min(1, "כותרת נדרשת").max(200, "כותרת ארוכה מדי"),
  description: z.string().max(1000, "תיאור ארוך מדי").optional(),
  order_index: z.coerce.number().int().min(0, "סדר לא תקין"),
});

export async function createUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = unitSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("units").insert({
    module_id: parsed.data.module_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
  })) as { data: UnitRow | null; error: unknown };
  if (error) return { status: "error", error: "שגיאה ביצירת היחידה — נסה שנית" };

  revalidatePath(`/admin/modules/${parsed.data.module_id}/units`);
  return { status: "success" };
}

export async function updateUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה יחידה חסר" };

  const parsed = unitSchema.safeParse({
    module_id: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    order_index: formData.get("order_index"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("units").update({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    order_index: parsed.data.order_index,
  }).eq("id", id)) as { data: UnitRow | null; error: unknown };
  if (error) return { status: "error", error: "שגיאה בעדכון היחידה — נסה שנית" };

  revalidatePath(`/admin/modules/${parsed.data.module_id}/units`);
  return { status: "success" };
}

export async function deleteUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id");
  const moduleId = formData.get("module_id");
  if (typeof id !== "string" || !id) return { status: "error", error: "מזהה יחידה חסר" };

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("units").delete().eq("id", id)) as { data: null; error: unknown };
  if (error) return { status: "error", error: "שגיאה במחיקת היחידה — נסה שנית" };

  if (typeof moduleId === "string" && moduleId) revalidatePath(`/admin/modules/${moduleId}/units`);
  revalidatePath("/admin/modules");
  return { status: "success" };
}
