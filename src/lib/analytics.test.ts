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

  it("keeps swim-test strokes separate and computes the best time across strokes", () => {
    const testLog = log("1", "2026-08-24", "a", "monday_am_test", {
      logType: "monday_test",
      time25yFreestyleSeconds: 10.9,
      time25yBreaststrokeSeconds: 13.4,
      pace3x100FreestyleSeconds: 61.2,
      pace3x100ImSeconds: 67.8,
    });
    const data = buildDashboardData([testLog]);
    expect(data.summary.best25ySeconds).toBe(10.9);
    expect(data.swimTests[0]).toMatchObject({
      time25yFreestyleSeconds: 10.9,
      time25yBreaststrokeSeconds: 13.4,
      pace3x100FreestyleSeconds: 61.2,
      pace3x100ImSeconds: 67.8,
      time25yFlySeconds: null,
    });
  });

  it("keeps athlete pairs separate and computes improvement as a negative Friday-minus-Monday delta", () => {
    const monday = log("1", "2026-08-24", "a", "monday_am_test", { logType: "monday_test", rpe: 8, fatigue: 6, time25yFreestyleSeconds: 11.1, pace3x100FreestyleSeconds: 65 });
    const friday = log("2", "2026-08-28", "a", "friday_am_test", { logType: "friday_test", rpe: 7, fatigue: 5, time25yFreestyleSeconds: 10.8, pace3x100FreestyleSeconds: 63.8 });
    const secondMonday = log("3", "2026-08-24", "b", "monday_am_test", { logType: "monday_test", time25yFreestyleSeconds: 12.2, pace3x100FreestyleSeconds: 62 });
    const secondFriday = log("4", "2026-08-28", "b", "friday_am_test", { logType: "friday_test", time25yFreestyleSeconds: 11.9, pace3x100FreestyleSeconds: 62.5 });
    const data = buildDashboardData([monday, friday, secondMonday, secondFriday]);
    expect(data.weekly25y).toHaveLength(2);
    expect(data.weekly25y[0]).toMatchObject({
      weekStart: "2026-08-24",
      stroke: "freestyle",
      athleteId: "a",
      athleteName: "a",
      mondaySeconds: 11.1,
      fridaySeconds: 10.8,
      deltaSeconds: -0.3,
    });
    expect(data.weekly25y[1]).toMatchObject({ athleteId: "b", mondaySeconds: 12.2, fridaySeconds: 11.9, deltaSeconds: -0.3 });
    expect(data.weekly3x100).toEqual([
      expect.objectContaining({ athleteId: "a", stroke: "freestyle", mondaySeconds: 65, fridaySeconds: 63.8, deltaSeconds: -1.2 }),
      expect.objectContaining({ athleteId: "b", stroke: "freestyle", mondaySeconds: 62, fridaySeconds: 62.5, deltaSeconds: 0.5 }),
    ]);
    expect(data.effort).toEqual([
      { date: "2026-08-24", sessionKey: "monday_am_test", rpe: 8, fatigue: 6 },
      { date: "2026-08-28", sessionKey: "friday_am_test", rpe: 7, fatigue: 5 },
    ]);
  });
});
