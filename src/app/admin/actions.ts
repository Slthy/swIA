"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { internalEmailForUsername } from "@/lib/utils";

export interface AdminActionState { error: string | null; success: string | null; credential?: string }
export interface AccountMutationState { error: string | null; success: string | null }
const username = z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9.-]+$/);
const accountSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  username,
  role: z.enum(["athlete", "coach", "admin"]),
  password: z.string().max(64).optional(),
}).superRefine((value, context) => {
  if (value.role !== "athlete" && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,64}$/.test(value.password ?? "")) {
    context.addIssue({ code: "custom", path: ["password"], message: "Staff passwords need 10+ letters and numbers." });
  }
});

export async function createAccountAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole(["admin"]);
  const parsed = accountSchema.safeParse({ displayName: formData.get("displayName"), username: formData.get("username"), role: formData.get("role"), password: formData.get("password") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the account details.", success: null };
  const temporaryPassword = parsed.data.role === "athlete" ? randomPin() : parsed.data.password!;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: internalEmailForUsername(parsed.data.username),
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { username: parsed.data.username, display_name: parsed.data.displayName, role: parsed.data.role },
  });
  if (error || !data.user) return { error: error?.message ?? "Account creation failed.", success: null };
  await admin.from("audit_events").insert({ actor_id: actor.id, action: "account.created", entity_type: "profile", entity_id: data.user.id, metadata: { role: parsed.data.role, username: parsed.data.username } });
  revalidatePath("/admin"); revalidatePath("/staff/athletes");
  return { error: null, success: `${parsed.data.displayName} was created.`, credential: temporaryPassword };
}

export async function resetAthletePinAction(userId: string) {
  const actor = await requireRole(["admin"]);
  const parsed = z.string().uuid().safeParse(userId);
  if (!parsed.success) throw new Error("That athlete account is invalid.");
  const pin = randomPin();
  const admin = createAdminSupabaseClient();
  const { data: target } = await admin.from("profiles").select("id").eq("id", parsed.data).eq("role", "athlete").is("deleted_at", null).maybeSingle();
  if (!target) throw new Error("That athlete account is unavailable.");
  const { error } = await admin.auth.admin.updateUserById(parsed.data, { password: pin });
  if (error) throw new Error(error.message);
  await admin.from("audit_events").insert({ actor_id: actor.id, action: "account.pin_reset", entity_type: "profile", entity_id: parsed.data });
  return pin;
}

export async function updateAccountPasswordAction(
  _state: AccountMutationState,
  formData: FormData,
): Promise<AccountMutationState> {
  const actor = await requireRole(["admin"]);
  const parsed = z.object({ userId: z.string().uuid(), password: z.string().min(6).max(64) }).safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid new password.", success: null };
  const admin = createAdminSupabaseClient();
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", parsed.data.userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (targetError || !target) return { error: "That account is unavailable.", success: null };
  const validPassword = target.role === "athlete"
    ? /^\d{6}$/.test(parsed.data.password)
    : /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,64}$/.test(parsed.data.password);
  if (!validPassword) {
    return {
      error: target.role === "athlete" ? "Athlete passwords must be exactly six digits." : "Staff passwords need 10–64 letters and numbers.",
      success: null,
    };
  }
  const { error } = await admin.auth.admin.updateUserById(target.id, { password: parsed.data.password });
  if (error) return { error: error.message, success: null };
  await admin.from("audit_events").insert({
    actor_id: actor.id,
    action: "account.password_changed",
    entity_type: "profile",
    entity_id: target.id,
    metadata: { role: target.role },
  });
  return { error: null, success: "Password updated." };
}

export async function deleteAccountsAction(
  _state: AccountMutationState,
  formData: FormData,
): Promise<AccountMutationState> {
  const actor = await requireRole(["admin"]);
  const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse([...new Set(formData.getAll("accountIds").map(String))]);
  if (!parsed.success) return { error: "Select at least one valid account.", success: null };
  if (parsed.data.includes(actor.id)) return { error: "You cannot delete the account you are currently using.", success: null };
  const admin = createAdminSupabaseClient();
  const { data: targets, error: targetError } = await admin
    .from("profiles")
    .select("id, username, role, active")
    .in("id", parsed.data)
    .is("deleted_at", null);
  if (targetError) return { error: targetError.message, success: null };
  if (targets?.length !== parsed.data.length) return { error: "One or more selected accounts are no longer available.", success: null };

  let deleted = 0;
  for (const target of targets) {
    const deletedAt = new Date().toISOString();
    const tombstoneUsername = `deleted.${target.id.replaceAll("-", "")}`;
    const { error: markError } = await admin.from("profiles").update({
      active: false,
      deleted_at: deletedAt,
      username: tombstoneUsername,
      updated_at: deletedAt,
    }).eq("id", target.id).is("deleted_at", null);
    if (markError) return { error: `Could not delete ${target.username}: ${markError.message}`, success: null };

    const { error: authError } = await admin.auth.admin.deleteUser(target.id, true);
    if (authError) {
      await admin.from("profiles").update({ active: target.active, deleted_at: null, username: target.username, updated_at: new Date().toISOString() }).eq("id", target.id);
      return { error: `Could not delete ${target.username}: ${authError.message}`, success: null };
    }
    if (target.role === "athlete") await admin.from("group_memberships").delete().eq("athlete_id", target.id);
    await admin.from("audit_events").insert({
      actor_id: actor.id,
      action: "account.deleted",
      entity_type: "profile",
      entity_id: target.id,
      metadata: { role: target.role, username: target.username },
    });
    deleted += 1;
  }
  revalidatePath("/admin"); revalidatePath("/staff"); revalidatePath("/staff/athletes"); revalidatePath("/staff/entries");
  return { error: null, success: `${deleted} ${deleted === 1 ? "account" : "accounts"} deleted.` };
}

export async function updateAthleteCategoryAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z.object({ athleteId: z.string().uuid(), category: z.enum(["men", "women", "unassigned"]) }).safeParse({ athleteId: formData.get("athleteId"), category: formData.get("category") });
  if (!parsed.success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("athletes").update({ team_category: parsed.data.category, updated_at: new Date().toISOString() }).eq("user_id", parsed.data.athleteId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin"); revalidatePath("/staff"); revalidatePath("/staff/athletes");
}

export async function createGroupAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = z.object({ name: z.string().trim().min(2).max(80), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }).safeParse({ name: formData.get("name"), color: formData.get("color") });
  if (!parsed.success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("groups").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/admin"); revalidatePath("/staff");
}

export async function setAthleteGroupsAction(formData: FormData) {
  await requireRole(["admin"]);
  const athleteId = z.string().uuid().safeParse(formData.get("athleteId"));
  const groupIds = z.array(z.string().uuid()).safeParse(formData.getAll("groupIds"));
  if (!athleteId.success || !groupIds.success) return;
  const supabase = await createServerSupabaseClient();
  const { error: deleteError } = await supabase.from("group_memberships").delete().eq("athlete_id", athleteId.data);
  if (deleteError) throw new Error(deleteError.message);
  if (groupIds.data.length) {
    const { error } = await supabase.from("group_memberships").insert(groupIds.data.map((groupId) => ({ group_id: groupId, athlete_id: athleteId.data })));
    if (error) throw new Error(error.message);
  }
  revalidatePath("/admin"); revalidatePath("/staff");
}

export async function toggleAccountAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const parsed = z.object({ userId: z.string().uuid(), active: z.enum(["true", "false"]) }).safeParse({ userId: formData.get("userId"), active: formData.get("active") });
  if (!parsed.success || parsed.data.userId === actor.id) return;
  const admin = createAdminSupabaseClient();
  const active = parsed.data.active === "true";
  const { error } = await admin.from("profiles").update({ active, updated_at: new Date().toISOString() }).eq("id", parsed.data.userId).is("deleted_at", null);
  if (error) throw new Error(error.message);
  await admin.from("audit_events").insert({ actor_id: actor.id, action: active ? "account.activated" : "account.deactivated", entity_type: "profile", entity_id: parsed.data.userId });
  revalidatePath("/admin");
}

function randomPin() { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
