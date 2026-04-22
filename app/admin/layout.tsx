import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <AdminNav profileName={profile.full_name} />
      <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
