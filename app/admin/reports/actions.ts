"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

export async function deleteBugReportAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = formData.get("id");
  if (!z.string().uuid().safeParse(id).success) {
    return { status: "error", error: "מזהה לא תקין" };
  }

  const supabase = asUntyped(await createClient());
  const { error } = (await supabase.from("bug_reports").delete().eq("id", id)) as {
    error: unknown;
  };
  if (error) return { status: "error", error: "מחיקה נכשלה" };

  revalidatePath("/admin/reports");
  return { status: "success" };
}
