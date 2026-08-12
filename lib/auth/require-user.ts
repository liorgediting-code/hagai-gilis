import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSessionUser } from "./session";

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
