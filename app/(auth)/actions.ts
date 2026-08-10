"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Shared action state type — used with React 19 useActionState
// ---------------------------------------------------------------------------
export type ActionState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: string };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "נדרשת סיסמה"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(1, "נדרש אימות סיסמה"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// loginAction
// ---------------------------------------------------------------------------
export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", error: "אימייל או סיסמה שגויים" };
  }

  // Fetch profile to determine redirect target.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", error: "שגיאה בהתחברות — נסה שנית" };
  }

  // Cast required: @supabase/ssr@0.6.1 wraps SupabaseClient with 3 generics, not 5,
  // so ClientOptions.PostgrestVersion never flows in and GetResult resolves to never.
  const { data: profileData } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()) as { data: Tables<"profiles"> | null; error: unknown };

  revalidatePath("/", "layout");
  // redirect() throws — must be outside try/catch
  const isAdmin = profileData !== null && profileData.role === "admin";
  redirect(isAdmin ? "/admin" : "/");
}

// ---------------------------------------------------------------------------
// logoutAction
// ---------------------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ---------------------------------------------------------------------------
// forgotPasswordAction
// ---------------------------------------------------------------------------
export async function forgotPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
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
  const origin = headerStore.get("origin") ?? `${proto}://${host}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  });

  // Always return success — don't leak whether the email exists.
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// resetPasswordAction
// ---------------------------------------------------------------------------
export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const supabase = await createClient();

  // Verify the recovery session exists before attempting the update.
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) {
    return {
      status: "error",
      error: "פג תוקף קישור האיפוס — אנא בקש קישור חדש",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[resetPasswordAction] updateUser failed:", error.message);
    const message = error.message.includes("different from the old password")
      ? "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית"
      : "לא ניתן לעדכן את הסיסמה — נסה שנית";
    return { status: "error", error: message };
  }

  revalidatePath("/", "layout");
  // Redirect to home; proxy + page.tsx handle role-based routing from there.
  redirect("/");
}

// ---------------------------------------------------------------------------
// setInvitePasswordAction — first-time password after admin invite
// ---------------------------------------------------------------------------
export async function setInvitePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      error: parsed.error.errors[0]?.message ?? "קלט לא תקין",
    };
  }

  const supabase = await createClient();

  // Verify the invite session exists before attempting the update.
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) {
    return {
      status: "error",
      error: "פג תוקף קישור ההזמנה — בקש מחגי לשלוח הזמנה חדשה",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", error: "לא ניתן להגדיר סיסמה — נסה שנית" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// ---------------------------------------------------------------------------
// changePasswordAction — logged-in user (student or admin) changes their own
// password, gated behind re-entering their current password
// ---------------------------------------------------------------------------
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

  revalidatePath("/", "layout");
  return { status: "success" };
}
