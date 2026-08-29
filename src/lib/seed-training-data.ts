import { subDays } from "date-fns";
import { sessionsForDate, toLocalISODate } from "@/lib/dates";
import type { LogType, SessionKey } from "@/lib/types";

export const TRAINING_GROUPS = [
  { name: "Sprint", color: "#ef6a67" },
  { name: "Mid-D", color: "#d99a2b" },
  { name: "Distance", color: "#2d7db6" },
] as const;

export type TrainingGroupName = (typeof TRAINING_GROUPS)[number]["name"];

export interface SeedAthlete {
  id: string;
  displayName: string;
}

export interface AssignedSeedAthlete extends SeedAthlete {
  group: TrainingGroupName;
  athleteIndex: number;
}

export interface TrainingSeedLogRow {
  athlete_id: string;
  log_type: LogType;
  session_key: SessionKey;
  activity_date: string;
  date_source: "staff_backfill";
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
  created_by: string;
  updated_by: string;
}

const profiles: Record<TrainingGroupName, {
  restingHr: number;
  time25y: number;
  pace3x100: number;
  zones: [number, number, number, number, number];
}> = {
  Sprint: { restingHr: 55, time25y: 10.8, pace3x100: 67, zones: [8, 18, 15, 12, 8] },
  "Mid-D": { restingHr: 52, time25y: 11.4, pace3x100: 62, zones: [10, 25, 18, 9, 5] },
  Distance: { restingHr: 49, time25y: 12.1, pace3x100: 58.5, zones: [12, 35, 20, 6, 3] },
};

export function assignTrainingGroups(athletes: SeedAthlete[]): AssignedSeedAthlete[] {
  if (athletes.length < 15) throw new Error("At least 15 active athlete accounts are required.");
  return athletes.slice(0, 15).map((athlete, athleteIndex) => ({
    ...athlete,
    athleteIndex,
    group: TRAINING_GROUPS[Math.floor(athleteIndex / 5)].name,
  }));
}

export function generateTrainingSeedLogs(
  athletes: AssignedSeedAthlete[],
  actorId: string,
  endDate: Date,
): TrainingSeedLogRow[] {
  const rows: TrainingSeedLogRow[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = subDays(endDate, offset);
    const activityDate = toLocalISODate(date);
    const daySeed = Math.floor(date.getTime() / 86_400_000);
    for (const athlete of athletes) {
      const variation = ((daySeed * 7 + athlete.athleteIndex * 3) % 5) - 2;
      const profile = profiles[athlete.group];
      rows.push({
        ...emptyRow(athlete.id, actorId, activityDate, "daily_wellness", "wellness"),
        soreness: clamp(4 + variation + (athlete.group === "Sprint" ? 1 : 0), 1, 10),
        academic_stress: clamp(5 + ((variation + athlete.athleteIndex) % 3), 1, 10),
        nutrition: clamp(8 - Math.abs(variation), 1, 10),
        resting_hr: clamp(profile.restingHr + variation, 20, 250),
        sleep_hours: round(7.5 - Math.max(variation, 0) * 0.25 + (athlete.group === "Distance" ? 0.25 : 0)),
      });

      for (const sessionKey of sessionsForDate(activityDate).filter((session) => session !== "daily_wellness")) {
        rows.push(makeSessionRow(athlete, actorId, activityDate, sessionKey, variation));
      }
    }
  }
  return rows;
}

function makeSessionRow(
  athlete: AssignedSeedAthlete,
  actorId: string,
  activityDate: string,
  sessionKey: Exclude<SessionKey, "daily_wellness">,
  variation: number,
): TrainingSeedLogRow {
  const isMondayTest = sessionKey === "monday_am_test";
  const isFridayTest = sessionKey === "friday_am_test";
  const isTest = isMondayTest || isFridayTest;
  const logType: LogType = isMondayTest ? "monday_test" : isFridayTest ? "friday_test" : "practice";
  const profile = profiles[athlete.group];
  const row = emptyRow(athlete.id, actorId, activityDate, sessionKey, logType);
  row.rpe = clamp(7 + Math.round(variation / 2) + (athlete.group === "Sprint" ? 1 : 0), 1, 10);
  row.fatigue = clamp(5 + variation + (sessionKey.includes("pm") ? 1 : 0), 1, 10);

  if (isTest) {
    row.time_25y_seconds = round(profile.time25y + variation * 0.08 + athlete.athleteIndex * 0.015);
    row.pace_3x100_seconds = round(profile.pace3x100 + variation * 0.3 + athlete.athleteIndex * 0.04);
    row.kick_count = 20 + athlete.athleteIndex % 6 + variation;
    row.stroke_count = 32 + athlete.athleteIndex % 7 + variation;
  } else if (!sessionKey.includes("lift")) {
    const multiplier = sessionKey.includes("pm") ? 1.08 : 1;
    [row.zone1_minutes, row.zone2_minutes, row.zone3_minutes, row.zone4_minutes, row.zone5_minutes] =
      profile.zones.map((minutes, zoneIndex) => round(Math.max(0, minutes * multiplier + variation * (zoneIndex < 2 ? 1 : 0.5)))) as [number, number, number, number, number];
  }
  return row;
}

function emptyRow(
  athleteId: string,
  actorId: string,
  activityDate: string,
  sessionKey: SessionKey,
  logType: LogType,
): TrainingSeedLogRow {
  return {
    athlete_id: athleteId,
    log_type: logType,
    session_key: sessionKey,
    activity_date: activityDate,
    date_source: "staff_backfill",
    soreness: null,
    academic_stress: null,
    nutrition: null,
    resting_hr: null,
    sleep_hours: null,
    rpe: null,
    fatigue: null,
    pace_3x100_seconds: null,
    time_25y_seconds: null,
    kick_count: null,
    stroke_count: null,
    zone1_minutes: null,
    zone2_minutes: null,
    zone3_minutes: null,
    zone4_minutes: null,
    zone5_minutes: null,
    created_by: actorId,
    updated_by: actorId,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
