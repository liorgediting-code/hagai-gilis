import "server-only";
import { redirect } from "next/navigation";

import { getSessionProfile, getSessionDeniedPages } from "./session";
import { requireUser } from "./require-user";
import type { PageKey } from "@/lib/types/course-types";

/**
 * Returns true if the current session user may access the given page.
 * Admins always return true. A row in user_permissions means DENIED.
 */
export async function pageAllowed(page: PageKey): Promise<boolean> {
  const profile = await getSessionProfile();
  if (profile?.role === "admin") return true;

  const denied = await getSessionDeniedPages();
  return !denied.has(page);
}

/**
 * Page-level guard. Call at the top of a Server Component page.
 * Redirects to /?blocked=<page> if the user does not have access.
 */
export async function requirePageAccess(page: PageKey): Promise<void> {
  await requireUser();
  const allowed = await pageAllowed(page);

  if (!allowed) {
    redirect(`/?blocked=${page}`);
  }
}
