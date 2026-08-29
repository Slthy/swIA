import { subDays } from "date-fns";
import { mondayOfWeek, sessionsForDate, toLocalISODate } from "@/lib/dates";
import type { LogType, SessionKey } from "@/lib/types";

export const TRAINING_GROUPS = [
  { name: "Sprint", color: "#ef6a67" },
  { name: "Mid-D", color: "#d99a2b" },
  { name: "Distance", color: "#2d7db6" },
] as const;

export type TrainingGroupName = (typeof TRAINING_GROUPS)[number]["name"];

export const MOCK_TRAINING_ATHLETES = TRAINING_GROUPS.flatMap((group) =>
  Array.from({ length: 5 }, (_, index) => ({
    displayName: `${group.name} Mock ${String(index + 1).padStart(2, "0")}`,
    username: `mock.${group.name.toLowerCase().replaceAll("-", "")}.${String(index + 1).padStart(2, "0")}`,
    group: group.name,
    teamCategory: index % 2 === 0 ? "women" as const : "men" as const,
  })),
);

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
  time_25y_breaststroke_seconds: number | null;
  time_25y_freestyle_seconds: number | null;
  time_25y_fly_seconds: number | null;
  time_25y_backstroke_seconds: number | null;
  pace_3x100_breaststroke_seconds: number | null;
  pace_3x100_freestyle_seconds: number | null;
  pace_3x100_fly_seconds: number | null;
  pace_3x100_backstroke_seconds: number | null;
  pace_3x100_im_seconds: number | null;
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
  row.rpe = clamp(6 + variation + athlete.athleteIndex % 3 + (athlete.group === "Sprint" ? 1 : 0) + (sessionKey.includes("pm") ? 1 : 0), 1, 10);
  row.fatigue = clamp(5 + variation + (athlete.athleteIndex * 2) % 3 + (sessionKey.includes("pm") ? 1 : 0), 1, 10);

  if (isTest) {
    const weekSeed = Math.floor(new Date(`${mondayOfWeek(activityDate)}T12:00:00Z`).getTime() / 604_800_000);
    const weeklyVariation = (positiveModulo(weekSeed * 3 + athlete.athleteIndex * 2, 9) - 4) * 0.09;
    const strokeIndex = positiveModulo(weekSeed + athlete.athleteIndex, 4);
    const strokeOffsets = [3.1, 0, 1.2, 1.8] as const;
    const weeklyDeltas = [-0.32, -0.24, -0.18, -0.11, -0.06, 0.07, 0.14, 0.23] as const;
    const delta = weeklyDeltas[positiveModulo(weekSeed + athlete.athleteIndex * 3, weeklyDeltas.length)];
    const monday25 = profile.time25y + weeklyVariation + athlete.athleteIndex * 0.015 + strokeOffsets[strokeIndex];
    const test25 = monday25 + (isFridayTest ? delta : 0);
    if (strokeIndex === 0) row.time_25y_breaststroke_seconds = round(test25);
    if (strokeIndex === 1) row.time_25y_freestyle_seconds = round(test25);
    if (strokeIndex === 2) row.time_25y_fly_seconds = round(test25);
    if (strokeIndex === 3) row.time_25y_backstroke_seconds = round(test25);
    const testVariation = (positiveModulo(weekSeed * 2 + athlete.athleteIndex * 5, 11) - 5) * 0.35 + (isFridayTest ? -0.25 : 0.25);
    const freestylePace = profile.pace3x100 + testVariation + athlete.athleteIndex * 0.04;
    row.pace_3x100_freestyle_seconds = round(freestylePace);
    row.pace_3x100_fly_seconds = round(freestylePace + 7 + athlete.athleteIndex * 0.04);
    row.pace_3x100_backstroke_seconds = round(freestylePace + 9 + athlete.athleteIndex * 0.05);
    row.pace_3x100_breaststroke_seconds = round(freestylePace + 14 + athlete.athleteIndex * 0.06);
    row.pace_3x100_im_seconds = round(freestylePace + 6 + athlete.athleteIndex * 0.035);
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
    time_25y_breaststroke_seconds: null,
    time_25y_freestyle_seconds: null,
    time_25y_fly_seconds: null,
    time_25y_backstroke_seconds: null,
    pace_3x100_breaststroke_seconds: null,
    pace_3x100_freestyle_seconds: null,
    pace_3x100_fly_seconds: null,
    pace_3x100_backstroke_seconds: null,
    pace_3x100_im_seconds: null,
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

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
