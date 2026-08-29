import { describe, expect, it } from "vitest";
import { buildSecondsDomain, formatSecondsTick, selectWeekly3x100Points, selectWeekly25yPoints } from "@/components/charts/swim-test-chart";
import type { Weekly3x100Point, Weekly25yPoint } from "@/lib/types";

describe("swim-test chart axes", () => {
  it("pads a flat series instead of exposing floating-point sentinel-looking ticks", () => {
    expect(buildSecondsDomain([10, 10, 10])).toEqual([9.9, 10.1]);
    expect(buildSecondsDomain([67.08, 67.08])).toEqual([66.58, 67.58]);
  });

  it("formats seconds without binary floating-point noise", () => {
    expect(formatSecondsTick(9.999999)).toBe("10");
    expect(formatSecondsTick(67.080001)).toBe("67.08");
  });

  it("selects an athlete pair instead of averaging team 25y times", () => {
    const pairs: Weekly25yPoint[] = [
      pair("a", "Athlete A", 10.5, 10.2),
      pair("b", "Athlete B", 9.8, 10.4),
      pair("c", "Athlete C", 10.4, 9.9),
    ];

    expect(selectWeekly25yPoints(pairs, "best-improvement")[0]).toMatchObject({
      athleteName: "Athlete C",
      mondaySeconds: 10.4,
      fridaySeconds: 9.9,
      deltaSeconds: -0.5,
    });
    expect(selectWeekly25yPoints(pairs, "fastest-time")[0]).toMatchObject({
      athleteName: "Athlete B",
      mondaySeconds: 9.8,
      fridaySeconds: 10.4,
      deltaSeconds: 0.6,
      fastestMonday: { athleteName: "Athlete B", seconds: 9.8 },
      fastestFriday: { athleteName: "Athlete C", seconds: 9.9 },
    });
  });

  it("applies the same athlete selection rules to 3x100 pairs", () => {
    const pairs: Weekly3x100Point[] = [
      pacePair("a", "Athlete A", 65, 63.8),
      pacePair("b", "Athlete B", 62, 62.5),
      pacePair("c", "Athlete C", 64, 61.8),
    ];

    expect(selectWeekly3x100Points(pairs, "best-improvement")[0]).toMatchObject({ athleteName: "Athlete C", deltaSeconds: -2.2 });
    expect(selectWeekly3x100Points(pairs, "fastest-time")[0]).toMatchObject({
      athleteName: "Athlete C",
      fastestMonday: { athleteName: "Athlete B", seconds: 62 },
      fastestFriday: { athleteName: "Athlete C", seconds: 61.8 },
    });
  });
});

function pair(athleteId: string, athleteName: string, mondaySeconds: number, fridaySeconds: number): Weekly25yPoint {
  return {
    weekStart: "2026-08-24",
    stroke: "breaststroke",
    athleteId,
    athleteName,
    mondaySeconds,
    fridaySeconds,
    deltaSeconds: Math.round((fridaySeconds - mondaySeconds) * 100) / 100,
  };
}

function pacePair(athleteId: string, athleteName: string, mondaySeconds: number, fridaySeconds: number): Weekly3x100Point {
  return {
    weekStart: "2026-08-24",
    stroke: "freestyle",
    athleteId,
    athleteName,
    mondaySeconds,
    fridaySeconds,
    deltaSeconds: Math.round((fridaySeconds - mondaySeconds) * 100) / 100,
  };
}
