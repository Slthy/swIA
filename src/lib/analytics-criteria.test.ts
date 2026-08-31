import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { ANALYTICS_RULE_IDS, getAnalyticsCriteria, parseAnalyticsCriteria } from "@/lib/analytics-criteria";

const validEnvironment = {
  ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS: "-0.10",
  ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS: "0.10",
  ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS: "4",
  ANALYTICS_25Y_WINDOW_OPTIONS_WEEKS: "4,8,12",
  ANALYTICS_25Y_TEAM_AGGREGATION: "median",
};

describe("analytics criteria", () => {
  it("loads the canonical criteria from .env.analytics", () => {
    expect(getAnalyticsCriteria()).toEqual({
      stableDeltaLowerSeconds: -0.1,
      stableDeltaUpperSeconds: 0.1,
      defaultWindowWeeks: 4,
      windowOptionsWeeks: [4, 8, 12],
      teamAggregation: "median",
    });
  });

  it("embeds every non-secret analytics value for the deployed server runtime", () => {
    expect(nextConfig.env).toMatchObject(validEnvironment);
  });

  it("rejects invalid stable bounds and unsupported defaults", () => {
    expect(() => parseAnalyticsCriteria({ ...validEnvironment, ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS: "0" })).toThrow(/must be negative/);
    expect(() => parseAnalyticsCriteria({ ...validEnvironment, ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS: "-0.1" })).toThrow(/must be positive/);
    expect(() => parseAnalyticsCriteria({ ...validEnvironment, ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS: "6" })).toThrow(/included in the window options/);
  });

  it("requires every registered rule to be documented", () => {
    const document = fs.readFileSync(path.join(process.cwd(), "docs/data-analysis-rules.md"), "utf8");
    for (const ruleId of ANALYTICS_RULE_IDS) expect(document).toContain(ruleId);
  });
});
