import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null; error: unknown };

  if (!profile || profile.role !== "admin") redirect("/");

  return { user, profile };
}
