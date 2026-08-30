import { describe, expect, it } from "vitest";
import { buildSecondsDomain, formatSecondsTick } from "@/components/charts/swim-test-chart";

describe("swim-test chart axes", () => {
  it("pads a flat series instead of exposing floating-point sentinel-looking ticks", () => {
    expect(buildSecondsDomain([10, 10, 10])).toEqual([9.9, 10.1]);
    expect(buildSecondsDomain([67.08, 67.08])).toEqual([66.58, 67.58]);
  });

  it("formats seconds without binary floating-point noise", () => {
    expect(formatSecondsTick(9.999999)).toBe("10");
    expect(formatSecondsTick(67.080001)).toBe("67.08");
  });
});
