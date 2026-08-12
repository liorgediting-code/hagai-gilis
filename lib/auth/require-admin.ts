import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSessionUser, getSessionProfile } from "./session";
import type { Tables } from "@/lib/types/database";

type Profile = Tables<"profiles">;

export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  return { user, profile };
}
