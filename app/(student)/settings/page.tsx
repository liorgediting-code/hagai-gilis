import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./_components/change-password-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">הגדרות</h1>

      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            שינוי סיסמה
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            מחובר כ־<span dir="ltr">{user.email}</span>
          </p>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
