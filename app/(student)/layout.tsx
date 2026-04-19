import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { UserPermissionRow } from "@/lib/types/course-types";
import { BlockedBanner } from "./_components/blocked-banner";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect admins to admin panel; unauthenticated users see content freely while auth is disabled.
  if (user) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: { role: string } | null; error: unknown };

    if (profile?.role === "admin") redirect("/admin");
  }

  const denied = new Set<string>();
  if (user) {
    const { data: deniedRows } = (await asUntyped(supabase)
      .from("user_permissions")
      .select("page")
      .eq("user_id", user.id)) as { data: UserPermissionRow[] | null; error: unknown };
    (deniedRows ?? []).forEach((r) => denied.add(r.page));
  }

  const name = user
    ? ((await supabase.from("profiles").select("full_name").eq("id", user.id).single()) as { data: { full_name: string | null } | null; error: unknown }).data?.full_name
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-heading text-base font-bold text-primary">
            חגי גיליס — מסחר
          </span>

          <nav className="flex items-center gap-1 text-sm font-medium" aria-label="ניווט ראשי">
            <Link href="/" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
              דף הבית
            </Link>
            {!denied.has("lessons") && (
              <Link href="/lessons" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
                שיעורים
              </Link>
            )}
            {!denied.has("exercises") && (
              <Link href="/exercises" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
                תרגולי שיעורים
              </Link>
            )}
            {!denied.has("summaries") && (
              <Link href="/summaries" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 flex items-center">
                סיכומים
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {name && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                שלום, {name}
              </span>
            )}
            {user && (
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm" className="min-h-9 text-muted-foreground hover:text-foreground">
                  התנתקות
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      <Suspense>
        <BlockedBanner />
      </Suspense>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
