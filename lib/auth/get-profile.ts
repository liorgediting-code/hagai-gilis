import "server-only";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

export async function getCurrentProfile(): Promise<{
  user: User;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Cast required: @supabase/ssr@0.6.1 / supabase-js@2.103.3 version mismatch causes
  // GetResult to resolve to never. See app/(auth)/actions.ts for full explanation.
  const { data: profile, error } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null; error: unknown };

  if (error || !profile) return null;

  return { user, profile };
}
