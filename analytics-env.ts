import { loadEnvFile } from "node:process";
import path from "node:path";

export const analyticsEnvironmentKeys = [
  "ANALYTICS_25Y_STABLE_DELTA_LOWER_SECONDS",
  "ANALYTICS_25Y_STABLE_DELTA_UPPER_SECONDS",
  "ANALYTICS_25Y_DEFAULT_WINDOW_WEEKS",
  "ANALYTICS_25Y_WINDOW_OPTIONS_WEEKS",
  "ANALYTICS_25Y_TEAM_AGGREGATION",
] as const;

type AnalyticsEnvironmentKey = (typeof analyticsEnvironmentKeys)[number];
export type AnalyticsEnvironment = Record<AnalyticsEnvironmentKey, string>;

export function loadAnalyticsEnvironment(): AnalyticsEnvironment {
  try {
    loadEnvFile(path.join(process.cwd(), ".env.analytics"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(".env.analytics is missing. Analytics criteria cannot be loaded.");
  }

  return Object.fromEntries(analyticsEnvironmentKeys.map((key) => {
    const value = process.env[key];
    if (value === undefined) throw new Error(`.env.analytics is missing ${key}.`);
    return [key, value];
  })) as AnalyticsEnvironment;
}
