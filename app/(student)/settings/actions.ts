"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/(auth)/actions";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "נדרשת סיסמה נוכחית"),
    newPassword: z.string().min(8, "הסיסמה החדשה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(1, "נדרש אימות סיסמה"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { status: "error", error: "עליך להתחבר מחדש כדי לשנות סיסמה" };
  }

  // Re-verify identity with the current password before allowing the change.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { status: "error", error: "הסיסמה הנוכחית שגויה" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    const message = error.message.includes("different from the old password")
      ? "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית"
      : "לא ניתן לעדכן את הסיסמה — נסה שנית";
    return { status: "error", error: message };
  }

  revalidatePath("/settings");
  return { status: "success" };
}
