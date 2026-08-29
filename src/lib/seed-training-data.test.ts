import { describe, expect, it } from "vitest";
import { isSessionAllowedForDate } from "@/lib/dates";
import { assignTrainingGroups, generateTrainingSeedLogs, TRAINING_GROUPS } from "@/lib/seed-training-data";

const athletes = Array.from({ length: 15 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  displayName: `Athlete ${index + 1}`,
}));

describe("training data seed", () => {
  it("assigns exactly five athletes to each category", () => {
    const assigned = assignTrainingGroups(athletes);
    for (const group of TRAINING_GROUPS) {
      expect(assigned.filter((athlete) => athlete.group === group.name)).toHaveLength(5);
    }
  });

  it("generates 30 valid days without duplicate athlete sessions", () => {
    const assigned = assignTrainingGroups(athletes);
    const logs = generateTrainingSeedLogs(assigned, "00000000-0000-4000-8000-999999999999", new Date(2026, 7, 28, 12));
    const wellness = logs.filter((log) => log.session_key === "daily_wellness");
    const identities = new Set(logs.map((log) => `${log.athlete_id}:${log.activity_date}:${log.session_key}`));
    expect(wellness).toHaveLength(15 * 30);
    expect(identities.size).toBe(logs.length);
    expect(logs.every((log) => isSessionAllowedForDate(log.session_key, log.activity_date))).toBe(true);
    expect(logs.filter((log) => log.session_key.includes("lift")).every((log) => log.zone1_minutes === null)).toBe(true);
  });
});
