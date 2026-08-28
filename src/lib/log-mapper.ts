import type { AthleteLog, DateSource, LogType, SessionKey } from "@/lib/types";

export interface AthleteLogRow {
  id: string;
  athlete_id: string;
  log_type: LogType;
  session_key: SessionKey;
  activity_date: string;
  date_source: DateSource;
  device_recorded_at: string | null;
  device_timezone: string | null;
  device_utc_offset_minutes: number | null;
  soreness: number | null;
  academic_stress: number | null;
  nutrition: number | null;
  resting_hr: number | null;
  sleep_hours: number | null;
  rpe: number | null;
  fatigue: number | null;
  pace_3x100_seconds: number | null;
  time_25y_seconds: number | null;
  kick_count: number | null;
  stroke_count: number | null;
  zone1_minutes: number | null;
  zone2_minutes: number | null;
  zone3_minutes: number | null;
  zone4_minutes: number | null;
  zone5_minutes: number | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string } | Array<{ display_name: string }> | null;
}

export function mapAthleteLog(row: AthleteLogRow): AthleteLog {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    athleteId: row.athlete_id,
    athleteName: profile?.display_name ?? "Athlete",
    logType: row.log_type,
    sessionKey: row.session_key,
    activityDate: row.activity_date,
    dateSource: row.date_source,
    deviceRecordedAt: row.device_recorded_at,
    deviceTimezone: row.device_timezone,
    deviceUtcOffsetMinutes: row.device_utc_offset_minutes,
    soreness: numberOrNull(row.soreness),
    academicStress: numberOrNull(row.academic_stress),
    nutrition: numberOrNull(row.nutrition),
    restingHr: numberOrNull(row.resting_hr),
    sleepHours: numberOrNull(row.sleep_hours),
    rpe: numberOrNull(row.rpe),
    fatigue: numberOrNull(row.fatigue),
    pace3x100Seconds: numberOrNull(row.pace_3x100_seconds),
    time25ySeconds: numberOrNull(row.time_25y_seconds),
    kickCount: numberOrNull(row.kick_count),
    strokeCount: numberOrNull(row.stroke_count),
    zone1Minutes: numberOrNull(row.zone1_minutes),
    zone2Minutes: numberOrNull(row.zone2_minutes),
    zone3Minutes: numberOrNull(row.zone3_minutes),
    zone4Minutes: numberOrNull(row.zone4_minutes),
    zone5Minutes: numberOrNull(row.zone5_minutes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function numberOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}
