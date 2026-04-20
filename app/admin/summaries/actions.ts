"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const summarySchema = z.object({
  lesson_id: z.string().uuid("מזהה שיעור לא תקין"),
  body_markdown: z.string().min(1, "תוכן הסיכום נדרש"),
});

export async function saveSummaryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = summarySchema.safeParse({
    lesson_id: formData.get("lesson_id"),
    body_markdown: formData.get("body_markdown"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase
    .from("lesson_summaries")
    .upsert({
      lesson_id: parsed.data.lesson_id,
      body_markdown: parsed.data.body_markdown,
    })) as { data: unknown; error: unknown };

  if (error) {
    return { status: "error", error: "שגיאה בשמירת הסיכום — נסה שנית" };
  }

  revalidatePath(`/admin/summaries/${parsed.data.lesson_id}`);
  revalidatePath(`/summaries/${parsed.data.lesson_id}`);
  return { status: "success" };
}
