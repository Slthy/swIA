export function hasSupabaseEnvironment(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getPublicSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Copy .env.example to .env.local and add the project credentials.");
  }
  return { url, anonKey };
}

export function getServerSupabaseEnvironment() {
  const publicEnvironment = getPublicSupabaseEnvironment();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  return { ...publicEnvironment, serviceRoleKey };
}
