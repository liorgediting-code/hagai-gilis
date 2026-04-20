"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const permissionSchema = z.object({
  user_id: z.string().uuid("מזהה משתמש לא תקין"),
  page: z.enum(["lessons", "exercises", "summaries"], {
    errorMap: () => ({ message: "עמוד לא תקין" }),
  }),
  deny: z.boolean(),
});

export async function togglePagePermissionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = permissionSchema.safeParse({
    user_id: formData.get("user_id"),
    page: formData.get("page"),
    deny: formData.get("deny") === "true",
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const supabase = asUntyped(await createClient());

  if (parsed.data.deny) {
    const { error } = (await supabase
      .from("user_permissions")
      .insert({
        user_id: parsed.data.user_id,
        page: parsed.data.page,
      })) as { data: unknown; error: unknown };

    if (error) {
      return { status: "error", error: "שגיאה בחסימת הגישה — נסה שנית" };
    }
  } else {
    const { error } = (await supabase
      .from("user_permissions")
      .delete()
      .eq("user_id", parsed.data.user_id)
      .eq("page", parsed.data.page)) as { data: null; error: unknown };

    if (error) {
      return { status: "error", error: "שגיאה בשחזור הגישה — נסה שנית" };
    }
  }

  revalidatePath("/admin/students/[id]", "page");
  return { status: "success" };
}
