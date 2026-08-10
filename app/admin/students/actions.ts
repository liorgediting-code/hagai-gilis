"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { ActionState } from "@/app/(auth)/actions";

const createStudentSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  full_name: z
    .string()
    .min(1, "שם מלא נדרש")
    .max(100, "שם מלא ארוך מדי")
    .transform((v) => v.trim()),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
});

export async function createStudentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Gate: must be admin — will redirect("/") if not
  await requireAdmin();

  const parsed = createStudentSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error) {
    return {
      status: "error",
      error:
        error.message.includes("already") || error.message.includes("exists")
          ? "כתובת האימייל כבר רשומה במערכת"
          : "שגיאה ביצירת התלמיד — נסה שנית",
    };
  }

  revalidatePath("/admin/students");
  return { status: "success" };
}
