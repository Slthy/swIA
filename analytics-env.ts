import { loadEnvFile } from "node:process";
import path from "node:path";

export function loadAnalyticsEnvironment() {
  try {
    loadEnvFile(path.join(process.cwd(), ".env.analytics"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    throw new Error(".env.analytics is missing. Analytics criteria cannot be loaded.");
  }
}
