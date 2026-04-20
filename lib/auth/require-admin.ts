import "server-only";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

// Auth temporarily disabled — returns stub data so admin pages render without login.
export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const stubUser = (user ?? { id: "anonymous", email: "" }) as unknown as User;
  const stubProfile: Profile = {
    id: stubUser.id,
    email: stubUser.email ?? "",
    full_name: "חגי גיליס",
    role: "admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { user: stubUser, profile: stubProfile };
}
