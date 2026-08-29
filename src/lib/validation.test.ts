import { describe, expect, it } from "vitest";
import { logInputSchema } from "@/lib/validation";

const context = { activityDate: "2026-08-24", dateSource: "device", deviceRecordedAt: "2026-08-24T12:00:00.000Z", deviceTimezone: "America/New_York", deviceUtcOffsetMinutes: -240 } as const;

describe("log validation", () => {
  it("accepts a valid Monday test", () => {
    const result = logInputSchema.safeParse({ ...context, logType: "monday_test", sessionKey: "monday_am_test", rpe: 7, fatigue: 5, pace3x100Seconds: null, time25ySeconds: 12.3, kickCount: null, strokeCount: null });
    expect(result.success).toBe(true);
  });

  it("accepts one 25y stroke and independent 3×100 stroke times", () => {
    const result = logInputSchema.safeParse({
      ...context,
      logType: "monday_test",
      sessionKey: "monday_am_test",
      rpe: 7,
      fatigue: 5,
      time25yBreaststrokeSeconds: null,
      time25yFreestyleSeconds: 10.8,
      time25yFlySeconds: null,
      time25yBackstrokeSeconds: null,
      pace3x100BreaststrokeSeconds: 76.4,
      pace3x100FreestyleSeconds: 61.2,
      pace3x100FlySeconds: 68.1,
      pace3x100BackstrokeSeconds: null,
      pace3x100ImSeconds: 67.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than one 25y stroke in a test session", () => {
    const result = logInputSchema.safeParse({
      ...context,
      logType: "monday_test",
      sessionKey: "monday_am_test",
      rpe: 7,
      fatigue: 5,
      time25yFreestyleSeconds: 10.8,
      time25yFlySeconds: 11.9,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a Monday test dated Tuesday", () => {
    const result = logInputSchema.safeParse({ ...context, activityDate: "2026-08-25", logType: "monday_test", sessionKey: "monday_am_test", rpe: 7, fatigue: 5, pace3x100Seconds: null, time25ySeconds: null, kickCount: null, strokeCount: null });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range wellness values", () => {
    const result = logInputSchema.safeParse({ ...context, logType: "wellness", sessionKey: "daily_wellness", soreness: 0, academicStress: 4, nutrition: 11, restingHr: null, sleepHours: null });
    expect(result.success).toBe(false);
  });
});
