import { z } from "zod";

const seconds = z.string().trim().transform((value, context) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: "custom", message: "must be a finite number" });
    return z.NEVER;
  }
  return parsed;
});

const positiveInteger = z.string().trim().transform((value, context) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    context.addIssue({ code: "custom", message: "must be a positive integer" });
    return z.NEVER;
  }
  return parsed;
});

const weekOptions = z.string().trim().transform((value, context) => {
  const parsed = [...new Set(value.split(",").map((part) => Number(part.trim())))];
  if (!parsed.length || parsed.some((week) => !Number.isInteger(week) || week <= 0)) {
    context.addIssue({ code: "custom", message: "must be a comma-separated list of positive integers" });
    return z.NEVER;
  }
  return parsed.sort((left, right) => left - right);
});

const criteriaSchema = z.object({
  stableDeltaLowerSeconds: seconds,
  stableDeltaUpperSeconds: seconds,
  defaultWindowWeeks: positiveInteger,
  windowOptionsWeeks: weekOptions,
  teamAggregation: z.literal("median"),
}).superRefine((value, context) => {
  if (value.stableDeltaLowerSeconds >= 0) {
    context.addIssue({ code: "custom", path: ["stableDeltaLowerSeconds"], message: "must be negative" });
  }
  if (value.stableDeltaUpperSeconds <= 0) {
    context.addIssue({ code: "custom", path: ["stableDeltaUpperSeconds"], message: "must be positive" });
  }
  if (value.stableDeltaLowerSeconds >= value.stableDeltaUpperSeconds) {
    context.addIssue({ code: "custom", path: ["stableDeltaLowerSeconds"], message: "must be lower than the upper bound" });
  }
  if (!value.windowOptionsWeeks.includes(value.defaultWindowWeeks)) {
    context.addIssue({ code: "custom", path: ["defaultWindowWeeks"], message: "must be included in the window options" });
  }
});

export type AnalyticsCriteria = z.infer<typeof criteriaSchema>;

export const ANALYTICS_RULE_IDS = [
  "DA-MISSING-001",
  "DA-WELLNESS-001",
  "DA-LOAD-001",
  "DA-ZONES-001",
  "DA-EFFORT-001",
  "DA-25Y-001",
  "DA-25Y-002",
  "DA-25Y-003",
  "DA-25Y-004",
  "DA-CONTEXT-001",
  "DA-3X100-001",
] as const;

export function parseAnalyticsCriteria(environment: Record<string, string | undefined>): AnalyticsCriteria {
  const parsed = criteriaSchema.safeParse({
    stableDeltaLowerSeconds: environment.ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS,
    stableDeltaUpperSeconds: environment.ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS,
    defaultWindowWeeks: environment.ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS,
    windowOptionsWeeks: environment.ANALYTICS_25Y_WINDOW_OPTIONS_WEEKS,
    teamAggregation: environment.ANALYTICS_25Y_TEAM_AGGREGATION,
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "criteria"}: ${issue.message}`).join("; ");
    throw new Error(`Invalid analytics criteria: ${details}`);
  }
  return parsed.data;
}

export function getAnalyticsCriteria(): AnalyticsCriteria {
  // Direct accesses let Next.js replace these non-secret values at build time.
  return parseAnalyticsCriteria({
    ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS: process.env.ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS,
    ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS: process.env.ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS,
    ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS: process.env.ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS,
    ANALYTICS_25Y_WINDOW_OPTIONS_WEEKS: process.env.ANALYTICS_25Y_WINDOW_OPTIONS_WEEKS,
    ANALYTICS_25Y_TEAM_AGGREGATION: process.env.ANALYTICS_25Y_TEAM_AGGREGATION,
  });
}
