import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnvironment } from "@/lib/env";

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getServerSupabaseEnvironment();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
