import "server-only";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import { requireUser } from "./require-user";
import type { PageKey, UserPermissionRow } from "@/lib/types/course-types";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

/**
 * Returns true if the user may access the given page.
 * Admins always return true. A row in user_permissions means DENIED.
 */
export async function pageAllowed(
  userId: string,
  page: PageKey,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()) as { data: Pick<Profile, "role"> | null; error: unknown };

  if (profile?.role === "admin") return true;

  const { data: denied } = (await asUntyped(supabase)
    .from("user_permissions")
    .select("page")
    .eq("user_id", userId)
    .eq("page", page)
    .maybeSingle()) as { data: UserPermissionRow | null; error: unknown };

  return denied === null;
}

/**
 * Page-level guard. Call at the top of a Server Component page.
 * Redirects to /?blocked=<page> if the user does not have access.
 */
export async function requirePageAccess(page: PageKey): Promise<void> {
  const user = await requireUser();
  const allowed = await pageAllowed(user.id, page);

  if (!allowed) {
    redirect(`/?blocked=${page}`);
  }
}
