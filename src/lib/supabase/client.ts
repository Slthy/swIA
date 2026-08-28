"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnvironment } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getPublicSupabaseEnvironment();
  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}
