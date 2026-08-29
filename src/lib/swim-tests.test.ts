import { describe, expect, it } from "vitest";
import { get25yResult, getSpecific25yResult } from "@/lib/swim-tests";

describe("25y stroke results", () => {
  it("identifies exactly one stroke-specific result", () => {
    expect(getSpecific25yResult({ time25yFreestyleSeconds: 10.8 })).toEqual({ stroke: "freestyle", seconds: 10.8 });
  });

  it("does not invent a stroke when multiple or only legacy results exist", () => {
    expect(getSpecific25yResult({ time25yFreestyleSeconds: 10.8, time25yFlySeconds: 11.9 })).toBeNull();
    expect(get25yResult({ time25ySeconds: 11.2 })).toEqual({ stroke: "legacy", seconds: 11.2 });
  });
});
