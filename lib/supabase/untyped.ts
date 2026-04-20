/**
 * Returns the supabase client cast as `unknown` then to a generic client type
 * so that tables not yet in database.ts can be queried without `any` or `never` errors.
 * Remove this file once `pnpm run db:types` has been re-run after 0002_courses migration.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// Minimal generic client interface for untyped table access
type UntypedClient = SupabaseClient;

export function asUntyped(client: unknown): UntypedClient {
  return client as UntypedClient;
}
