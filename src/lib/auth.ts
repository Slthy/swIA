import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile, Role, TeamCategory } from "@/lib/types";

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
  athletes: { team_category: TeamCategory } | Array<{ team_category: TeamCategory }> | null;
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!hasSupabaseEnvironment()) return null;
  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, active, athletes(team_category)")
    .eq("id", authData.user.id)
    .single();

  if (!data || !data.active) return null;
  const row = data as unknown as ProfileRow;
  const athlete = Array.isArray(row.athletes) ? row.athletes[0] : row.athletes;
  let groupIds: string[] = [];
  if (row.role === "athlete") {
    const { data: memberships } = await supabase.from("group_memberships").select("group_id").eq("athlete_id", row.id);
    groupIds = memberships?.map((item) => item.group_id) ?? [];
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    teamCategory: athlete?.team_category ?? null,
    groupIds,
  };
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireRole(roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect(profile.role === "athlete" ? "/athlete" : "/staff");
  return profile;
}
