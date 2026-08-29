import { subDays } from "date-fns";
import { SESSION_LABELS } from "@/lib/constants";
import { sessionsForDate, toLocalISODate } from "@/lib/dates";
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
  for (let offset = 20; offset >= 0; offset -= 1) {
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
            time25yFreestyleSeconds: 11.5 + (seed % 6) * 0.16,
            time25yBackstrokeSeconds: 13.2 + (seed % 6) * 0.17,
            time25yBreaststrokeSeconds: 14.6 + (seed % 6) * 0.2,
            time25yFlySeconds: 12.7 + (seed % 6) * 0.18,
            pace3x100FreestyleSeconds: 62 + (seed % 7) * 0.45,
            pace3x100BackstrokeSeconds: 71 + (seed % 7) * 0.5,
            pace3x100BreaststrokeSeconds: 77 + (seed % 7) * 0.55,
            pace3x100FlySeconds: 69 + (seed % 7) * 0.5,
            pace3x100ImSeconds: 68 + (seed % 7) * 0.48,
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
