import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profileName = user
    ? ((await supabase.from("profiles").select("full_name").eq("id", user.id).single()) as { data: { full_name: string | null } | null; error: unknown }).data?.full_name ?? null
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <AdminNav profileName={profileName} />
      <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
