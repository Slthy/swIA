"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { internalEmailForUsername } from "@/lib/utils";

export interface AdminActionState { error: string | null; success: string | null; credential?: string }
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
  const pin = randomPin();
  const admin = createAdminSupabaseClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: pin });
  if (error) throw new Error(error.message);
  await admin.from("audit_events").insert({ actor_id: actor.id, action: "account.pin_reset", entity_type: "profile", entity_id: userId });
  return pin;
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
  const { error } = await admin.from("profiles").update({ active, updated_at: new Date().toISOString() }).eq("id", parsed.data.userId);
  if (error) throw new Error(error.message);
  await admin.from("audit_events").insert({ actor_id: actor.id, action: active ? "account.activated" : "account.deactivated", entity_type: "profile", entity_id: parsed.data.userId });
  revalidatePath("/admin");
}

function randomPin() { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
