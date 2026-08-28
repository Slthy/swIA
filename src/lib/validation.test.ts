import { describe, expect, it } from "vitest";
import { logInputSchema } from "@/lib/validation";

const context = { activityDate: "2026-08-24", dateSource: "device", deviceRecordedAt: "2026-08-24T12:00:00.000Z", deviceTimezone: "America/New_York", deviceUtcOffsetMinutes: -240 } as const;

describe("log validation", () => {
  it("accepts a valid Monday test", () => {
    const result = logInputSchema.safeParse({ ...context, logType: "monday_test", sessionKey: "monday_am_test", rpe: 7, fatigue: 5, pace3x100Seconds: null, time25ySeconds: 12.3, kickCount: null, strokeCount: null });
    expect(result.success).toBe(true);
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
