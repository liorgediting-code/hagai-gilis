"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", error: "לא ניתן לעדכן את הסיסמה — נסה שנית" };
  }

  revalidatePath("/", "layout");
  // Redirect to home; proxy + page.tsx handle role-based routing from there.
  redirect("/");
}

// ---------------------------------------------------------------------------
// activateAccountAction — student sets password for the first time (no session required)
// ---------------------------------------------------------------------------
const activateSchema = z
  .object({
    email: z.string().email("כתובת אימייל לא תקינה"),
    password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
    confirmPassword: z.string().min(1, "נדרש אימות סיסמה"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

export async function activateAccountAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = activateSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.errors[0]?.message ?? "קלט לא תקין" };
  }

  const admin = createAdminClient();

  // Fetch all users and find by email (small platform — up to 1000 users)
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError || !usersData?.users) {
    return { status: "error", error: "שגיאה בגישה למשתמשים — נסה שנית" };
  }
  const existing = usersData.users.find(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
  );

  if (!existing) {
    return { status: "error", error: "המייל לא נמצא במערכת — ודא שחגי הוסיף אותך" };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: parsed.data.password,
  });

  if (updateError) {
    return { status: "error", error: "שגיאה בהגדרת הסיסמה — נסה שנית" };
  }

  // Ensure profile row exists — trigger may not have fired if user was created outside the invite flow
  await admin.from("profiles").upsert(
    {
      id: existing.id,
      email: parsed.data.email,
      full_name: (existing.user_metadata?.full_name as string | undefined) ?? null,
      role: "student",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  // Sign in automatically with the new password
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  revalidatePath("/", "layout");
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
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", error: "לא ניתן להגדיר סיסמה — נסה שנית" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
