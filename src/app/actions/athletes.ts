"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { internalEmailForUsername } from "@/lib/utils";

export interface AthleteProfileActionState {
  error: string | null;
  success: string | null;
}

const usernameSchema = z.string().trim().toLowerCase().min(3).max(80).regex(
  /^[a-z0-9.-]+$/,
  "Usernames can only contain lowercase letters, numbers, periods, and hyphens.",
);

const athleteProfileSchema = z.object({
  athleteId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(120),
  username: usernameSchema.optional(),
  teamCategory: z.enum(["men", "women", "unassigned"]),
  groupIds: z.array(z.string().uuid()),
});

export async function updateAthleteProfileAction(
  _state: AthleteProfileActionState,
  formData: FormData,
): Promise<AthleteProfileActionState> {
  const actor = await requireProfile();
  const parsed = athleteProfileSchema.safeParse({
    athleteId: formData.get("athleteId"),
    displayName: formData.get("displayName"),
    username: formData.get("username") || undefined,
    teamCategory: formData.get("teamCategory"),
    groupIds: formData.getAll("groupIds"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the athlete information.", success: null };
  }
  if (actor.role === "athlete" && actor.id !== parsed.data.athleteId) {
    return { error: "Athletes can only edit their own profile.", success: null };
  }

  const admin = createAdminSupabaseClient();
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, display_name, username, role, athletes!inner(team_category)")
    .eq("id", parsed.data.athleteId)
    .eq("role", "athlete")
    .is("deleted_at", null)
    .maybeSingle();
  if (targetError || !target) return { error: "That athlete account could not be found.", success: null };

  const athleteRow = Array.isArray(target.athletes) ? target.athletes[0] : target.athletes;
  const originalCategory = athleteRow?.team_category ?? "unassigned";
  const originalUsername = target.username;
  const nextUsername = actor.role === "admin" && parsed.data.username ? parsed.data.username : originalUsername;
  const groupIds = [...new Set(parsed.data.groupIds)];
  const canManageGroups = actor.role === "coach" || actor.role === "admin";

  if (nextUsername !== originalUsername) {
    const { data: duplicate, error } = await admin
      .from("profiles")
      .select("id")
      .eq("username", nextUsername)
      .neq("id", target.id)
      .maybeSingle();
    if (error) return { error: "The username could not be checked.", success: null };
    if (duplicate) return { error: "That username is already in use.", success: null };
  }

  if (canManageGroups && groupIds.length) {
    const { data: validGroups, error } = await admin.from("groups").select("id").in("id", groupIds);
    if (error || validGroups?.length !== groupIds.length) {
      return { error: "One or more training groups are no longer available.", success: null };
    }
  }

  const { data: originalMemberships, error: membershipsError } = await admin
    .from("group_memberships")
    .select("group_id")
    .eq("athlete_id", target.id);
  if (membershipsError) return { error: "Training groups could not be loaded.", success: null };

  const rollback = async () => {
    await Promise.allSettled([
      admin.from("profiles").update({
        display_name: target.display_name,
        username: originalUsername,
        updated_at: new Date().toISOString(),
      }).eq("id", target.id),
      admin.from("athletes").update({
        team_category: originalCategory,
        updated_at: new Date().toISOString(),
      }).eq("user_id", target.id),
      admin.auth.admin.updateUserById(target.id, {
        email: internalEmailForUsername(originalUsername),
        user_metadata: { username: originalUsername, display_name: target.display_name, role: "athlete" },
      }),
    ]);
    if (canManageGroups) {
      await admin.from("group_memberships").delete().eq("athlete_id", target.id);
      if (originalMemberships?.length) {
        await admin.from("group_memberships").insert(
          originalMemberships.map((membership) => ({ athlete_id: target.id, group_id: membership.group_id })),
        );
      }
    }
  };

  try {
    const timestamp = new Date().toISOString();
    const { error: profileError } = await admin.from("profiles").update({
      display_name: parsed.data.displayName,
      username: nextUsername,
      updated_at: timestamp,
    }).eq("id", target.id);
    if (profileError) throw profileError;

    const { error: athleteError } = await admin.from("athletes").update({
      team_category: parsed.data.teamCategory,
      updated_at: timestamp,
    }).eq("user_id", target.id);
    if (athleteError) throw athleteError;

    if (canManageGroups) {
      const { error: deleteError } = await admin.from("group_memberships").delete().eq("athlete_id", target.id);
      if (deleteError) throw deleteError;
      if (groupIds.length) {
        const { error: insertError } = await admin.from("group_memberships").insert(
          groupIds.map((groupId) => ({ athlete_id: target.id, group_id: groupId })),
        );
        if (insertError) throw insertError;
      }
    }

    const { error: authError } = await admin.auth.admin.updateUserById(target.id, {
      email: internalEmailForUsername(nextUsername),
      user_metadata: { username: nextUsername, display_name: parsed.data.displayName, role: "athlete" },
    });
    if (authError) throw authError;
  } catch {
    await rollback();
    return { error: "The athlete profile could not be saved. No changes were kept.", success: null };
  }

  await admin.from("audit_events").insert({
    actor_id: actor.id,
    action: "athlete.profile_updated",
    entity_type: "profile",
    entity_id: target.id,
    metadata: {
      display_name: parsed.data.displayName,
      team_category: parsed.data.teamCategory,
      username_changed: nextUsername !== originalUsername,
      groups_changed: canManageGroups,
    },
  });

  revalidatePath("/athlete");
  revalidatePath("/athlete/profile");
  revalidatePath("/staff");
  revalidatePath("/staff/athletes");
  revalidatePath(`/staff/athletes/${target.id}`);
  revalidatePath("/admin");
  return { error: null, success: "Athlete information saved." };
}
