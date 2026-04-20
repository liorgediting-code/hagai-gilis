"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const inviteStudentSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  full_name: z
    .string()
    .min(1, "שם מלא נדרש")
    .max(100, "שם מלא ארוך מדי")
    .transform((v) => v.trim()),
});

export async function inviteStudentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Gate: must be admin — will redirect("/") if not
  await requireAdmin();

  const parsed = inviteStudentSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name },
      redirectTo: `${origin}/auth/callback?type=invite`,
    },
  );

  if (error) {
    return {
      status: "error",
      error:
        error.message.includes("already") || error.message.includes("exists")
          ? "כתובת האימייל כבר רשומה במערכת"
          : "שגיאה בשליחת ההזמנה — נסה שנית",
    };
  }

  revalidatePath("/admin/students");
  return { status: "success" };
}
