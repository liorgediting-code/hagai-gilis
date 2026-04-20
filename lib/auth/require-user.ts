import "server-only";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// Auth temporarily disabled — returns user if session exists, null otherwise.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Return a stub user if not authenticated so pages render without login.
  return user ?? { id: "anonymous", email: "" } as unknown as User;
}
