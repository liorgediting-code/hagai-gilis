import "server-only";
import type { User } from "@supabase/supabase-js";

import { getSessionUser, getSessionProfile } from "./session";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

export async function getCurrentProfile(): Promise<{
  user: User;
  profile: Profile;
} | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const profile = await getSessionProfile();
  if (!profile) return null;

  return { user, profile };
}
