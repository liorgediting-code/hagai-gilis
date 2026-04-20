import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { UserPermissionRow } from "@/lib/types/course-types";
import { BlockedBanner } from "./_components/blocked-banner";
import { BottomTabBar } from "./_components/bottom-tab-bar";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect admins to admin panel; unauthenticated users see content freely while auth is disabled.
  // Fetch profile (role + name) and permissions in parallel — one round-trip instead of three.
  let name: string | null = null;
  const denied = new Set<string>();

  if (user) {
    const [{ data: profile }, { data: deniedRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single() as unknown as Promise<{ data: { role: string; full_name: string | null } | null }>,
      asUntyped(supabase)
        .from("user_permissions")
        .select("page")
        .eq("user_id", user.id) as unknown as Promise<{ data: UserPermissionRow[] | null }>,
    ]);

    if (profile?.role === "admin") redirect("/admin");
    name = profile?.full_name ?? null;
    (deniedRows ?? []).forEach((r) => denied.add(r.page));
  }

  const deniedList = Array.from(denied);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Desktop header */}
      <header className="sticky top-0 z-30 hidden border-b border-border/50 bg-card/95 backdrop-blur-sm md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-heading text-base font-bold text-primary">
            חגי גיליס — מסחר
          </span>

          <nav className="flex items-center gap-1 text-sm font-medium" aria-label="ניווט ראשי">
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              דף הבית
            </Link>
            {!denied.has("lessons") && (
              <Link
                href="/lessons"
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                שיעורים
              </Link>
            )}
            {!denied.has("exercises") && (
              <Link
                href="/exercises"
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                תרגולי שיעורים
              </Link>
            )}
            {!denied.has("summaries") && (
              <Link
                href="/summaries"
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
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
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="min-h-9 text-muted-foreground hover:text-foreground"
                >
                  התנתקות
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      {/* Mobile top bar – brand + greeting + logout */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/95 backdrop-blur-sm md:hidden pt-safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-heading text-base font-bold text-primary">
            חגי גיליס
          </span>
          <div className="flex items-center gap-2">
            {name && (
              <span className="text-sm text-muted-foreground">שלום, {name}</span>
            )}
            {user && (
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="min-h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  יציאה
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      <Suspense>
        <BlockedBanner />
      </Suspense>

      {/* pb-24 reserves space above the bottom tab bar on mobile */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:py-8 md:pb-8">
        {children}
      </main>

      <BottomTabBar denied={deniedList} />
    </div>
  );
}
