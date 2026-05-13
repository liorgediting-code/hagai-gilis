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

const marketActionSchema = z.object({
  user_id: z.string().uuid("מזהה משתמש לא תקין"),
  action: z.enum(["grant", "revoke_grant", "deny", "revoke_deny"], {
    errorMap: () => ({ message: "פעולה לא תקינה" }),
  }),
});

export async function toggleMarketPermissionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = marketActionSchema.safeParse({
    user_id: formData.get("user_id"),
    action: formData.get("action"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const { user_id, action } = parsed.data;
  const supabase = asUntyped(await createClient());

  if (action === "grant") {
    await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market_deny");
    const { error } = await supabase.from("user_permissions").insert({ user_id, page: "market" });
    if (error && error.code !== "23505") return { status: "error", error: "שגיאה בפתיחת גישה" };
  } else if (action === "revoke_grant") {
    const { error } = await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market");
    if (error) return { status: "error", error: "שגיאה בביטול הגישה" };
  } else if (action === "deny") {
    await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market");
    const { error } = await supabase.from("user_permissions").insert({ user_id, page: "market_deny" });
    if (error && error.code !== "23505") return { status: "error", error: "שגיאה בחסימת גישה" };
  } else {
    const { error } = await supabase.from("user_permissions").delete().eq("user_id", user_id).eq("page", "market_deny");
    if (error) return { status: "error", error: "שגיאה בהסרת החסימה" };
  }

  revalidatePath("/admin/students/[id]", "page");
  return { status: "success" };
}
