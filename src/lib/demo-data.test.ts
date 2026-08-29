import { describe, expect, it } from "vitest";
import { buildDashboardData } from "@/lib/analytics";
import { createDemoLogs } from "@/lib/demo-data";

describe("demo dashboard data", () => {
  it("includes a visible Monday–Friday delta for every 25y stroke", () => {
    const data = buildDashboardData(createDemoLogs(new Date(2026, 7, 29, 12)));

    expect(data.summary.daysTracked).toBe(30);
    expect(new Set(data.weekly25y.map((point) => point.stroke))).toEqual(
      new Set(["breaststroke", "freestyle", "fly", "backstroke"]),
    );
    expect(data.weekly25y.find((point) => point.stroke === "breaststroke")).toMatchObject({
      mondaySeconds: 14.16,
      fridaySeconds: 13.98,
      improvementSeconds: 0.18,
    });
  });
});
