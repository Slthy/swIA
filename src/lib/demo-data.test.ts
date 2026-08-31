import { describe, expect, it } from "vitest";
import { buildDashboardData } from "@/lib/analytics";
import { createDemoLogs } from "@/lib/demo-data";

describe("demo dashboard data", () => {
  it("includes all daily 25y stroke assignments and freestyle-only 3x100 data", () => {
    const data = buildDashboardData(createDemoLogs(new Date(2026, 7, 29, 12)));

    expect(data.summary.daysTracked).toBe(30);
    expect(new Set(data.daily25y.map((point) => point.stroke))).toEqual(
      new Set(["breaststroke", "freestyle", "fly", "backstroke"]),
    );
    expect(new Set(data.daily25y.map((point) => point.day))).toEqual(new Set(["Monday", "Friday"]));
    expect(data.daily25y.every((point) => point.timeSeconds > 0 && point.kickCount !== null && point.strokeCount !== null)).toBe(true);
    expect(data.daily3x100.length).toBeGreaterThan(0);
    expect(data.daily3x100.every((point) => point.paceSeconds > 0)).toBe(true);
    expect(data.weekly25y.athleteWeeks.some((week) => week.possibleRecoveryMismatch)).toBe(true);
  });
});
