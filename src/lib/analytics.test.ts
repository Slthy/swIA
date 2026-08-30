import { describe, expect, it } from "vitest";
import { buildDashboardData } from "@/lib/analytics";
import type { AthleteLog, SessionKey } from "@/lib/types";

function log(id: string, date: string, athleteId: string, sessionKey: SessionKey, values: Partial<AthleteLog>): AthleteLog {
  return { id, athleteId, athleteName: athleteId, logType: sessionKey === "daily_wellness" ? "wellness" : "practice", sessionKey, activityDate: date, dateSource: "device", deviceRecordedAt: null, deviceTimezone: null, deviceUtcOffsetMinutes: null, soreness: null, academicStress: null, nutrition: null, restingHr: null, sleepHours: null, rpe: null, fatigue: null, pace3x100Seconds: null, time25ySeconds: null, time25yBreaststrokeSeconds: null, time25yFreestyleSeconds: null, time25yFlySeconds: null, time25yBackstrokeSeconds: null, pace3x100BreaststrokeSeconds: null, pace3x100FreestyleSeconds: null, pace3x100FlySeconds: null, pace3x100BackstrokeSeconds: null, pace3x100ImSeconds: null, kickCount: null, strokeCount: null, zone1Minutes: null, zone2Minutes: null, zone3Minutes: null, zone4Minutes: null, zone5Minutes: null, createdAt: "", updatedAt: "", ...values };
}

describe("dashboard aggregation", () => {
  it("ignores missing wellness values instead of treating them as zero", () => {
    const data = buildDashboardData([log("1", "2026-08-24", "a", "daily_wellness", { soreness: 4, academicStress: 6, nutrition: 8 }), log("2", "2026-08-25", "a", "daily_wellness", { soreness: 6, academicStress: 4, nutrition: null })]);
    expect(data.summary.avgSoreness).toBe(5);
    expect(data.summary.avgNutrition).toBe(8);
    expect(data.wellness[1].nutrition).toBeNull();
  });

  it("averages session RPE within athlete-day before the overall daily load", () => {
    const data = buildDashboardData([log("1", "2026-08-24", "a", "monday_lift", { rpe: 4 }), log("2", "2026-08-24", "a", "monday_pm_swim", { rpe: 8 }), log("3", "2026-08-24", "b", "monday_lift", { rpe: 9 })]);
    expect(data.summary.avgDailyLoad).toBe(7.5);
    expect(data.load[0].dailyLoad).toBe(7.5);
  });

  it("recomputes HR-zone daily columns from athlete-day totals", () => {
    const data = buildDashboardData([log("1", "2026-08-24", "a", "monday_lift", { zone1Minutes: 10, zone2Minutes: 20 }), log("2", "2026-08-24", "a", "monday_pm_swim", { zone1Minutes: 5, zone2Minutes: 10 })]);
    expect(data.zones[0]).toMatchObject({ zone1: 15, zone2: 30 });
  });

  it("groups daily 25y results by assigned stroke and keeps 3x100 freestyle only", () => {
    const freestyle = log("1", "2026-08-24", "a", "monday_am_test", {
      logType: "monday_test",
      time25yFreestyleSeconds: 10.9,
      pace3x100FreestyleSeconds: 61.2,
      kickCount: 20,
      strokeCount: 34,
    });
    const breaststroke = log("2", "2026-08-24", "b", "monday_am_test", { logType: "monday_test", time25yBreaststrokeSeconds: 13.4, kickCount: 24, strokeCount: 38 });
    const data = buildDashboardData([freestyle, breaststroke]);
    expect(data.summary.best25ySeconds).toBe(10.9);
    expect(data.summary.best3x100Seconds).toBe(61.2);
    expect(data.daily25y).toEqual([
      expect.objectContaining({ day: "Monday", stroke: "breaststroke", timeSeconds: 13.4, kickCount: 24, strokeCount: 38, athleteCount: 1 }),
      expect.objectContaining({ day: "Monday", stroke: "freestyle", timeSeconds: 10.9, kickCount: 20, strokeCount: 34, athleteCount: 1 }),
    ]);
    expect(data.daily3x100).toEqual([{ date: "2026-08-24", day: "Monday", paceSeconds: 61.2, athleteCount: 1 }]);
  });

  it("allows Monday and Friday to use different strokes and averages team values by day", () => {
    const monday = log("1", "2026-08-24", "a", "monday_am_test", { logType: "monday_test", rpe: 8, fatigue: 6, time25yFreestyleSeconds: 11.1, pace3x100FreestyleSeconds: 65, kickCount: 20, strokeCount: 32 });
    const friday = log("2", "2026-08-28", "a", "friday_am_test", { logType: "friday_test", rpe: 7, fatigue: 5, time25yBreaststrokeSeconds: 13.8, pace3x100FreestyleSeconds: 63.8, kickCount: 24, strokeCount: 38 });
    const secondMonday = log("3", "2026-08-24", "b", "monday_am_test", { logType: "monday_test", time25yFreestyleSeconds: 12.1, pace3x100FreestyleSeconds: 63, kickCount: 22, strokeCount: 34 });
    const secondFriday = log("4", "2026-08-28", "b", "friday_am_test", { logType: "friday_test", time25yBreaststrokeSeconds: 14.2, pace3x100FreestyleSeconds: 62.2, kickCount: 26, strokeCount: 40 });
    const data = buildDashboardData([monday, friday, secondMonday, secondFriday]);
    expect(data.daily25y).toEqual([
      expect.objectContaining({ date: "2026-08-24", day: "Monday", stroke: "freestyle", timeSeconds: 11.6, kickCount: 21, strokeCount: 33, athleteCount: 2 }),
      expect.objectContaining({ date: "2026-08-28", day: "Friday", stroke: "breaststroke", timeSeconds: 14, kickCount: 25, strokeCount: 39, athleteCount: 2 }),
    ]);
    expect(data.daily3x100).toEqual([
      { date: "2026-08-24", day: "Monday", paceSeconds: 64, athleteCount: 2 },
      { date: "2026-08-28", day: "Friday", paceSeconds: 63, athleteCount: 2 },
    ]);
    expect(data.effort).toEqual([
      { date: "2026-08-24", sessionKey: "monday_am_test", rpe: 8, fatigue: 6 },
      { date: "2026-08-28", sessionKey: "friday_am_test", rpe: 7, fatigue: 5 },
    ]);
  });
});
