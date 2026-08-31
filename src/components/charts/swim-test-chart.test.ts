import { describe, expect, it } from "vitest";
import { buildDeltaDomain, buildSecondsDomain, formatSecondsTick } from "@/components/charts/swim-test-chart";

const criteria = { stableDeltaLowerSeconds: -0.1, stableDeltaUpperSeconds: 0.1, defaultWindowWeeks: 4, windowOptionsWeeks: [4, 8, 12], teamAggregation: "median" as const };

describe("swim-test chart axes", () => {
  it("pads a flat series instead of exposing floating-point sentinel-looking ticks", () => {
    expect(buildSecondsDomain([10, 10, 10])).toEqual([9.9, 10.1]);
    expect(buildSecondsDomain([67.08, 67.08])).toEqual([66.58, 67.58]);
  });

  it("formats seconds without binary floating-point noise", () => {
    expect(formatSecondsTick(9.999999)).toBe("10");
    expect(formatSecondsTick(67.080001)).toBe("67.08");
  });

  it("keeps improvement and regression deltas symmetric around zero", () => {
    expect(buildDeltaDomain([-0.2, 0.5], criteria)).toEqual([-0.6, 0.6]);
    expect(buildDeltaDomain([], criteria)).toEqual([-0.12, 0.12]);
  });
});
