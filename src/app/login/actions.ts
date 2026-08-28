"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { internalEmailForUsername } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";

export interface LoginState {
  error: string | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Check your username and password." };

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const secret = process.env.LOGIN_IP_HASH_SECRET ?? "local-development-only";
  const identifierHash = createHash("sha256")
    .update(`${secret}:${forwardedFor}:${parsed.data.username}`)
    .digest("hex");

  const admin = createAdminSupabaseClient();
  const { data: attempt } = await admin.from("login_attempts").select("*").eq("identifier_hash", identifierHash).maybeSingle();
  const now = Date.now();
  if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > now) {
    return { error: "Too many attempts. Try again in 15 minutes or contact an administrator." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmailForUsername(parsed.data.username),
    password: parsed.data.password,
  });

  if (error || !data.user) {
    await recordFailedAttempt(identifierHash, attempt, now);
    return { error: "Check your username and password." };
  }

  const { data: profile } = await admin.from("profiles").select("active").eq("id", data.user.id).single();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "This account is inactive. Contact an administrator." };
  }

  await admin.from("login_attempts").delete().eq("identifier_hash", identifierHash);
  redirect("/");
}

async function recordFailedAttempt(
  identifierHash: string,
  previous: { attempts: number; window_started_at: string } | null,
  now: number,
) {
  const admin = createAdminSupabaseClient();
  const windowStart = previous ? new Date(previous.window_started_at).getTime() : 0;
  const inWindow = now - windowStart < WINDOW_MINUTES * 60_000;
  const attempts = inWindow ? (previous?.attempts ?? 0) + 1 : 1;
  const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now + WINDOW_MINUTES * 60_000).toISOString() : null;
  await admin.from("login_attempts").upsert({
    identifier_hash: identifierHash,
    attempts,
    window_started_at: inWindow && previous ? previous.window_started_at : new Date(now).toISOString(),
    blocked_until: blockedUntil,
    updated_at: new Date(now).toISOString(),
  });
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
