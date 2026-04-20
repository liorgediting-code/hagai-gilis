import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./_components/set-password-form";

export default async function ActivateAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // No session means the invite link expired or was never clicked
  if (!user?.email) {
    redirect("/login?error=expired_invite");
  }

  return <SetPasswordForm userEmail={user.email} />;
}
