import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { asUntyped } from "@/lib/supabase/untyped";
import type { Tables } from "@/lib/types/database";
import type { UserPermissionRow } from "@/lib/types/course-types";

type Profile = Tables<"profiles">;

/**
 * `auth.getUser()` is a network round-trip to Supabase's auth server, not a
 * local JWT read. Layout, page guards, and pages each used to call it
 * independently on the same request. `cache()` memoizes per-request, so
 * every caller below shares one actual call.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  // Cast required: @supabase/ssr@0.6.1 / supabase-js@2.103.3 version mismatch causes
  // GetResult to resolve to never. See app/(auth)/actions.ts for full explanation.
  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null; error: unknown };

  return profile;
});

export const getSessionDeniedPages = cache(async (): Promise<Set<string>> => {
  const user = await getSessionUser();
  if (!user) return new Set();

  const supabase = await createClient();
  const { data } = (await asUntyped(supabase)
    .from("user_permissions")
    .select("page")
    .eq("user_id", user.id)) as { data: UserPermissionRow[] | null };

  return new Set((data ?? []).map((r) => r.page));
});
