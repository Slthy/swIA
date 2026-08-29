import { subDays } from "date-fns";
import { SESSION_LABELS } from "@/lib/constants";
import { mondayOfWeek, sessionsForDate, toLocalISODate } from "@/lib/dates";
import type { AthleteLog, Profile, SessionKey } from "@/lib/types";

export const DEMO_ATHLETE: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "alex.rivera",
  displayName: "Alex Rivera",
  role: "athlete",
  teamCategory: "women",
  groupIds: [],
};

export const DEMO_COACH: Profile = {
  id: "00000000-0000-4000-8000-000000000002",
  username: "coach.preview",
  displayName: "Coach Preview",
  role: "coach",
  teamCategory: null,
  groupIds: [],
};

export function createDemoLogs(endDate = new Date()): AthleteLog[] {
  const logs: AthleteLog[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = subDays(endDate, offset);
    const activityDate = toLocalISODate(date);
    const sessions = sessionsForDate(activityDate);
    const seed = date.getDate() + date.getMonth() * 3;
    logs.push(
      makeLog(activityDate, "daily_wellness", {
        soreness: 2 + (seed % 5),
        academicStress: 3 + ((seed * 2) % 5),
        nutrition: 6 + (seed % 4),
        restingHr: 49 + (seed % 8),
        sleepHours: 6.5 + (seed % 5) * 0.25,
      }),
    );
    for (const session of sessions.filter((item) => item !== "daily_wellness")) {
      if (session === "monday_am_test" || session === "friday_am_test") {
        logs.push(
          makeLog(activityDate, session, {
            rpe: 6 + (seed % 4),
            fatigue: 4 + (seed % 5),
            ...demo25yResult(activityDate, session === "friday_am_test"),
            pace3x100FreestyleSeconds: 62 + ((seed * 3) % 11) * 0.42,
            pace3x100BackstrokeSeconds: 71 + ((seed * 5) % 11) * 0.46,
            pace3x100BreaststrokeSeconds: 77 + ((seed * 7) % 11) * 0.52,
            pace3x100FlySeconds: 69 + ((seed * 4) % 11) * 0.48,
            pace3x100ImSeconds: 68 + ((seed * 6) % 11) * 0.45,
            kickCount: 18 + (seed % 8),
            strokeCount: 34 + (seed % 7),
          }),
        );
      } else {
        logs.push(
          makeLog(activityDate, session, {
            rpe: 5 + (seed % 5),
            fatigue: 3 + (seed % 6),
            zone1Minutes: 8 + (seed % 5),
            zone2Minutes: 24 + (seed % 12),
            zone3Minutes: 12 + (seed % 10),
            zone4Minutes: 5 + (seed % 8),
            zone5Minutes: 2 + (seed % 5),
          }),
        );
      }
    }
  }
  return logs;
}

function demo25yResult(activityDate: string, isFriday: boolean): Partial<AthleteLog> {
  const weekSeed = Math.floor(new Date(`${mondayOfWeek(activityDate)}T12:00:00Z`).getTime() / 604_800_000);
  const strokeIndex = ((weekSeed % 4) + 4) % 4;
  const fields = ["time25yBreaststrokeSeconds", "time25yFreestyleSeconds", "time25yFlySeconds", "time25yBackstrokeSeconds"] as const;
  const bases = [14.6, 11.5, 12.7, 13.2] as const;
  const variation = ((((weekSeed * 3) % 9) + 9) % 9 - 4) * 0.11;
  const improvement = (((weekSeed % 7) + 7) % 7 - 2) * 0.06;
  return { [fields[strokeIndex]]: bases[strokeIndex] + variation - (isFriday ? improvement : 0) };
}

function makeLog(activityDate: string, sessionKey: SessionKey, values: Partial<AthleteLog>): AthleteLog {
  const isWellness = sessionKey === "daily_wellness";
  const isMonday = sessionKey === "monday_am_test";
  const isFriday = sessionKey === "friday_am_test";
  return {
    id: `${activityDate}-${sessionKey}`,
    athleteId: DEMO_ATHLETE.id,
    athleteName: DEMO_ATHLETE.displayName,
    logType: isWellness ? "wellness" : isMonday ? "monday_test" : isFriday ? "friday_test" : "practice",
    sessionKey,
    activityDate,
    dateSource: "device",
    deviceRecordedAt: `${activityDate}T12:00:00.000Z`,
    deviceTimezone: "America/New_York",
    deviceUtcOffsetMinutes: -240,
    soreness: null,
    academicStress: null,
    nutrition: null,
    restingHr: null,
    sleepHours: null,
    rpe: null,
    fatigue: null,
    pace3x100Seconds: null,
    time25ySeconds: null,
    time25yBreaststrokeSeconds: null,
    time25yFreestyleSeconds: null,
    time25yFlySeconds: null,
    time25yBackstrokeSeconds: null,
    pace3x100BreaststrokeSeconds: null,
    pace3x100FreestyleSeconds: null,
    pace3x100FlySeconds: null,
    pace3x100BackstrokeSeconds: null,
    pace3x100ImSeconds: null,
    kickCount: null,
    strokeCount: null,
    zone1Minutes: null,
    zone2Minutes: null,
    zone3Minutes: null,
    zone4Minutes: null,
    zone5Minutes: null,
    createdAt: `${activityDate}T12:00:00.000Z`,
    updatedAt: `${activityDate}T12:00:00.000Z`,
    ...values,
  };
}

export function demoCompletionLabel(sessionKey: SessionKey) {
  return SESSION_LABELS[sessionKey];
}
