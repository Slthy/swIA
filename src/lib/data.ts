import { createDemoLogs } from "@/lib/demo-data";
import { hasSupabaseEnvironment } from "@/lib/env";
import { mapAthleteLog, type AthleteLogRow } from "@/lib/log-mapper";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AthleteLog, Profile, TeamCategory } from "@/lib/types";

export interface AthleteListItem {
  id: string;
  displayName: string;
  username: string;
  teamCategory: TeamCategory;
  active: boolean;
}

export interface LogQuery {
  athleteId?: string;
  from?: string;
  to?: string;
}

export interface GroupListItem {
  id: string;
  name: string;
  color: string;
  athleteIds: string[];
}

export interface ProfileListItem {
  id: string;
  displayName: string;
  username: string;
  role: "athlete" | "coach" | "admin";
  active: boolean;
}

export async function getLogs(profile: Profile, query: LogQuery = {}): Promise<AthleteLog[]> {
  if (!hasSupabaseEnvironment()) return createDemoLogs();
  const supabase = await createServerSupabaseClient();
  let request = supabase.from("athlete_logs").select("*").is("deleted_at", null).order("activity_date", { ascending: true });
  const athleteId = profile.role === "athlete" ? profile.id : query.athleteId;
  if (athleteId) request = request.eq("athlete_id", athleteId);
  if (query.from) request = request.gte("activity_date", query.from);
  if (query.to) request = request.lte("activity_date", query.to);
  const { data, error } = await request;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AthleteLogRow[];
  const ids = [...new Set(rows.map((row) => row.athlete_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    for (const item of profiles ?? []) names.set(item.id, item.display_name);
  }
  return rows.map((row) => mapAthleteLog({ ...row, profiles: { display_name: names.get(row.athlete_id) ?? "Athlete" } }));
}

export async function getAthletes(): Promise<AthleteListItem[]> {
  if (!hasSupabaseEnvironment()) {
    return [
      { id: "00000000-0000-4000-8000-000000000001", displayName: "Alex Rivera", username: "alex.rivera", teamCategory: "women", active: true },
      { id: "00000000-0000-4000-8000-000000000003", displayName: "Jordan Kim", username: "jordan.kim", teamCategory: "men", active: true },
      { id: "00000000-0000-4000-8000-000000000004", displayName: "Taylor Brooks", username: "taylor.brooks", teamCategory: "unassigned", active: true },
    ];
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, active, athletes!inner(team_category)")
    .eq("role", "athlete")
    .order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((item) => {
    const athlete = Array.isArray(item.athletes) ? item.athletes[0] : item.athletes;
    return {
      id: item.id,
      displayName: item.display_name,
      username: item.username,
      teamCategory: (athlete?.team_category ?? "unassigned") as TeamCategory,
      active: item.active,
    };
  });
}

export async function getGroups(): Promise<GroupListItem[]> {
  if (!hasSupabaseEnvironment()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("groups").select("id, name, color, group_memberships(athlete_id)").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    color: group.color,
    athleteIds: (group.group_memberships ?? []).map((membership) => membership.athlete_id),
  }));
}

export async function getProfiles(): Promise<ProfileListItem[]> {
  if (!hasSupabaseEnvironment()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("id, display_name, username, role, active").order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((profile) => ({ id: profile.id, displayName: profile.display_name, username: profile.username, role: profile.role, active: profile.active }));
}

export async function getDeletedLogs(profile: Profile): Promise<AthleteLog[]> {
  if (!hasSupabaseEnvironment() || profile.role !== "admin") return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("athlete_logs").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AthleteLogRow[];
  const ids = [...new Set(rows.map((row) => row.athlete_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    for (const item of profiles ?? []) names.set(item.id, item.display_name);
  }
  return rows.map((row) => mapAthleteLog({ ...row, profiles: { display_name: names.get(row.athlete_id) ?? "Athlete" } }));
}
