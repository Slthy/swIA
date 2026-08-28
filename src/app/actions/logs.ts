"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logInputSchema, type LogInput } from "@/lib/validation";

export type SaveLogResult =
  | { status: "saved"; id: string }
  | { status: "duplicate"; id: string }
  | { status: "error"; message: string; fields?: Record<string, string[]> };

export async function saveLog(input: unknown, confirmOverwrite = false): Promise<SaveLogResult> {
  const parsed = logInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Review the highlighted values.", fields: parsed.error.flatten().fieldErrors };
  }

  const profile = await requireProfile();
  const value = parsed.data;
  const athleteId = profile.role === "athlete" ? profile.id : value.athleteId;
  if (!athleteId) return { status: "error", message: "Select an athlete." };

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("athlete_logs")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("activity_date", value.activityDate)
    .eq("session_key", value.sessionKey)
    .maybeSingle();

  if (existing && !confirmOverwrite) return { status: "duplicate", id: existing.id };

  const payload = toDatabaseLog(value, athleteId, profile.id, profile.role !== "athlete");
  if (existing) {
    const { error } = await supabase.from("athlete_logs").update(payload.update).eq("id", existing.id);
    if (error) return { status: "error", message: error.message };
    revalidateLogViews();
    return { status: "saved", id: existing.id };
  }

  const { data, error } = await supabase.from("athlete_logs").insert(payload.insert).select("id").single();
  if (error || !data) return { status: "error", message: error?.message ?? "The entry could not be saved." };
  revalidateLogViews();
  return { status: "saved", id: data.id };
}

function toDatabaseLog(value: LogInput, athleteId: string, actorId: string, isStaff: boolean) {
  const common = {
    athlete_id: athleteId,
    log_type: value.logType,
    session_key: value.sessionKey,
    activity_date: value.activityDate,
    date_source: isStaff && value.dateSource === "manual" ? "staff_backfill" : value.dateSource,
    device_recorded_at: value.deviceRecordedAt,
    device_timezone: value.deviceTimezone,
    device_utc_offset_minutes: value.deviceUtcOffsetMinutes,
    soreness: value.logType === "wellness" ? value.soreness : null,
    academic_stress: value.logType === "wellness" ? value.academicStress : null,
    nutrition: value.logType === "wellness" ? value.nutrition : null,
    resting_hr: value.logType === "wellness" ? value.restingHr : null,
    sleep_hours: value.logType === "wellness" ? value.sleepHours : null,
    rpe: value.logType === "wellness" ? null : value.rpe,
    fatigue: value.logType === "wellness" ? null : value.fatigue,
    pace_3x100_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.pace3x100Seconds : null,
    time_25y_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.time25ySeconds : null,
    kick_count: value.logType === "monday_test" || value.logType === "friday_test" ? value.kickCount : null,
    stroke_count: value.logType === "monday_test" || value.logType === "friday_test" ? value.strokeCount : null,
    zone1_minutes: value.logType === "practice" ? value.zone1Minutes : null,
    zone2_minutes: value.logType === "practice" ? value.zone2Minutes : null,
    zone3_minutes: value.logType === "practice" ? value.zone3Minutes : null,
    zone4_minutes: value.logType === "practice" ? value.zone4Minutes : null,
    zone5_minutes: value.logType === "practice" ? value.zone5Minutes : null,
    updated_by: actorId,
  };
  return { update: common, insert: { ...common, created_by: actorId } };
}

function revalidateLogViews() {
  revalidatePath("/athlete");
  revalidatePath("/athlete/trends");
  revalidatePath("/athlete/history");
  revalidatePath("/staff");
  revalidatePath("/staff/entries");
}

export async function softDeleteLogAction(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("athlete_logs").update({ deleted_at: new Date().toISOString(), deleted_by: profile.id }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateLogViews(); revalidatePath("/admin");
}

export async function restoreLogAction(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("athlete_logs").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateLogViews(); revalidatePath("/admin");
}
