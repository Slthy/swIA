import { describe, expect, it } from "vitest";
import { analyticsInternals, buildDashboardData } from "@/lib/analytics";
import { getAnalyticsCriteria } from "@/lib/analytics-criteria";
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
    expect(data.weekly25y.athleteWeeks.every((week) => !week.possibleRecoveryMismatch)).toBe(true);
    expect(data.weekly25y.athleteWeeks).toEqual(expect.arrayContaining([
      expect.objectContaining({ stroke: "freestyle", monday: expect.any(Object), friday: null }),
      expect.objectContaining({ stroke: "breaststroke", monday: null, friday: expect.any(Object) }),
    ]));
  });

  it("flags a like-stroke Monday improvement with a Friday regression and attaches week context", () => {
    const logs = [
      log("m1", "2026-08-17", "a", "monday_am_test", { athleteName: "Alex", logType: "monday_test", time25yFreestyleSeconds: 11, kickCount: 20, strokeCount: 32 }),
      log("f1", "2026-08-21", "a", "friday_am_test", { athleteName: "Alex", logType: "friday_test", time25yFreestyleSeconds: 11.2, kickCount: 21, strokeCount: 33 }),
      log("m2", "2026-08-24", "a", "monday_am_test", { athleteName: "Alex", logType: "monday_test", time25yFreestyleSeconds: 10.8, kickCount: 19, strokeCount: 31 }),
      log("f2", "2026-08-28", "a", "friday_am_test", { athleteName: "Alex", logType: "friday_test", time25yFreestyleSeconds: 11.4, kickCount: 23, strokeCount: 35 }),
      log("wm", "2026-08-24", "a", "daily_wellness", { athleteName: "Alex", soreness: 2, sleepHours: 8 }),
      log("wf", "2026-08-28", "a", "daily_wellness", { athleteName: "Alex", soreness: 5, sleepHours: 6.5 }),
      log("p1", "2026-08-24", "a", "monday_lift", { athleteName: "Alex", rpe: 8, fatigue: 7 }),
      log("p2", "2026-08-25", "a", "tuesday_am_swim", { athleteName: "Alex", rpe: 9, fatigue: 8 }),
    ];
    const data = buildDashboardData(logs, { scope: "individual" });
    const current = data.weekly25y.athleteWeeks.find((week) => week.weekStart === "2026-08-24" && week.stroke === "freestyle");
    expect(current).toMatchObject({
      possibleRecoveryMismatch: true,
      monday: { previousDate: "2026-08-17", classification: "faster" },
      friday: { previousDate: "2026-08-21", classification: "slower" },
      context: { averagePracticeRpe: 8.5, averagePracticeFatigue: 7.5, fridaySleepHours: 6.5, fridaySoreness: 5, sleepChange: -1.5, sorenessChange: 3 },
    });
    expect(current?.monday?.deltaSeconds).toBeCloseTo(-0.2);
    expect(current?.friday?.deltaSeconds).toBeCloseTo(0.2);
    expect(current?.fridayMinusMondaySeconds).toBeCloseTo(0.6);
  });

  it("uses configured inclusive stable bounds", () => {
    const criteria = getAnalyticsCriteria();
    expect(analyticsInternals.classifyDelta(-0.1, criteria)).toBe("stable");
    expect(analyticsInternals.classifyDelta(0.1, criteria)).toBe("stable");
    expect(analyticsInternals.classifyDelta(-0.11, criteria)).toBe("faster");
    expect(analyticsInternals.classifyDelta(0.11, criteria)).toBe("slower");
  });

  it("uses pre-window history for the first visible comparable delta without plotting it", () => {
    const history = [
      log("old-m", "2026-07-27", "a", "monday_am_test", { logType: "monday_test", time25yBreaststrokeSeconds: 14.4 }),
      log("visible-m", "2026-08-24", "a", "monday_am_test", { logType: "monday_test", time25yBreaststrokeSeconds: 14.1 }),
    ];
    const data = buildDashboardData([history[1]], { scope: "individual", progressionHistory: history });
    expect(data.weekly25y.athleteWeeks).toHaveLength(1);
    expect(data.weekly25y.athleteWeeks[0]).toMatchObject({
      weekStart: "2026-08-24",
      monday: { previousDate: "2026-07-27", deltaSeconds: expect.closeTo(-0.3) },
    });
  });

  it("uses medians of athlete-level changes for the team trend", () => {
    const rows: AthleteLog[] = [];
    const athletes = [
      { id: "a", previousMonday: 10, previousFriday: 10.2, monday: 9.8, friday: 10.4 },
      { id: "b", previousMonday: 11, previousFriday: 11.2, monday: 10.8, friday: 11.4 },
      { id: "c", previousMonday: 30, previousFriday: 30, monday: 40, friday: 40 },
    ];
    for (const athlete of athletes) {
      rows.push(
        log(`${athlete.id}-m1`, "2026-08-17", athlete.id, "monday_am_test", { logType: "monday_test", time25yFreestyleSeconds: athlete.previousMonday }),
        log(`${athlete.id}-f1`, "2026-08-21", athlete.id, "friday_am_test", { logType: "friday_test", time25yFreestyleSeconds: athlete.previousFriday }),
        log(`${athlete.id}-m2`, "2026-08-24", athlete.id, "monday_am_test", { logType: "monday_test", time25yFreestyleSeconds: athlete.monday }),
        log(`${athlete.id}-f2`, "2026-08-28", athlete.id, "friday_am_test", { logType: "friday_test", time25yFreestyleSeconds: athlete.friday }),
      );
    }
    const current = buildDashboardData(rows).weekly25y.teamWeeks.find((week) => week.weekStart === "2026-08-24" && week.stroke === "freestyle");
    expect(current).toMatchObject({ mondayTimeSeconds: 10.8, fridayTimeSeconds: 11.4, comparableAthleteCount: 3, flaggedAthleteCount: 2 });
    expect(current?.mondayDeltaSeconds).toBeCloseTo(-0.2);
    expect(current?.fridayDeltaSeconds).toBeCloseTo(0.2);
  });
});
