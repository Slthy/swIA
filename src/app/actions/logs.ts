"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logInputSchema, type LogInput } from "@/lib/validation";

export type SaveLogResult =
  | { status: "saved"; id: string }
  | { status: "duplicate"; id: string }
  | { status: "error"; message: string; fields?: Record<string, string[]> };

export interface BulkLogActionState { error: string | null; success: string | null }

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
    time_25y_breaststroke_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.time25yBreaststrokeSeconds : null,
    time_25y_freestyle_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.time25yFreestyleSeconds : null,
    time_25y_fly_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.time25yFlySeconds : null,
    time_25y_backstroke_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.time25yBackstrokeSeconds : null,
    pace_3x100_breaststroke_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.pace3x100BreaststrokeSeconds : null,
    pace_3x100_freestyle_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.pace3x100FreestyleSeconds : null,
    pace_3x100_fly_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.pace3x100FlySeconds : null,
    pace_3x100_backstroke_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.pace3x100BackstrokeSeconds : null,
    pace_3x100_im_seconds: value.logType === "monday_test" || value.logType === "friday_test" ? value.pace3x100ImSeconds : null,
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
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("athlete_logs").update({ deleted_at: new Date().toISOString(), deleted_by: profile.id }).eq("id", id.data).is("deleted_at", null);
  if (error) throw new Error(error.message);
  revalidateLogViews(); revalidatePath("/admin");
}

export async function bulkSoftDeleteLogsAction(
  logIds: unknown,
): Promise<BulkLogActionState> {
  const profile = await requireRole(["admin"]);
  const parsed = z.array(z.string().uuid()).min(1).max(5_000).safeParse(
    Array.isArray(logIds) ? [...new Set(logIds.map(String))] : logIds,
  );
  if (!parsed.success) return { error: "Select at least one valid entry.", success: null };
  const supabase = await createServerSupabaseClient();
  const deletedAt = new Date().toISOString();
  let deleted = 0;
  const finish = (error: string | null = null): BulkLogActionState => {
    revalidateLogViews(); revalidatePath("/admin");
    return {
      error,
      success: deleted > 0 ? `${deleted} ${deleted === 1 ? "entry" : "entries"} moved to Deleted logs.` : null,
    };
  };
  for (let index = 0; index < parsed.data.length; index += 100) {
    const ids = parsed.data.slice(index, index + 100);
    const { data, error } = await supabase
      .from("athlete_logs")
      .update({ deleted_at: deletedAt, deleted_by: profile.id })
      .in("id", ids)
      .is("deleted_at", null)
      .select("id");
    if (error) return finish(error.message);
    deleted += data?.length ?? 0;
  }
  return deleted > 0 ? finish() : finish("The selected entries were already deleted or are no longer available.");
}

export async function restoreLogAction(formData: FormData) {
  await requireRole(["admin"]);
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("athlete_logs").update({ deleted_at: null, deleted_by: null }).eq("id", id.data).not("deleted_at", "is", null);
  if (error) throw new Error(error.message);
  revalidateLogViews(); revalidatePath("/admin");
}
