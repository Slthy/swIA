import { describe, expect, it } from "vitest";
import { isSessionAllowedForDate, mondayOfWeek } from "@/lib/dates";
import { assignTrainingGroups, generateTrainingSeedLogs, MOCK_TRAINING_ATHLETES, TRAINING_GROUPS } from "@/lib/seed-training-data";

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

  it("defines 15 unique, clearly labeled mock accounts", () => {
    expect(MOCK_TRAINING_ATHLETES).toHaveLength(15);
    expect(new Set(MOCK_TRAINING_ATHLETES.map((athlete) => athlete.username)).size).toBe(15);
    expect(MOCK_TRAINING_ATHLETES.every((athlete) => athlete.username.startsWith("mock.") && athlete.displayName.includes("Mock"))).toBe(true);
    for (const group of TRAINING_GROUPS) {
      expect(MOCK_TRAINING_ATHLETES.filter((athlete) => athlete.group === group.name)).toHaveLength(5);
      expect(MOCK_TRAINING_ATHLETES.filter((athlete) => athlete.group === group.name && athlete.teamCategory === "women")).toHaveLength(3);
      expect(MOCK_TRAINING_ATHLETES.filter((athlete) => athlete.group === group.name && athlete.teamCategory === "men")).toHaveLength(2);
    }
    expect(new Set(MOCK_TRAINING_ATHLETES.map((athlete) => athlete.teamCategory))).toEqual(new Set(["women", "men"]));
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
    const tests = logs.filter((log) => log.log_type === "monday_test" || log.log_type === "friday_test");
    expect(tests).not.toHaveLength(0);
    expect(tests.every((log) =>
      [log.time_25y_breaststroke_seconds, log.time_25y_freestyle_seconds, log.time_25y_fly_seconds, log.time_25y_backstroke_seconds].filter((value) => value !== null).length === 1
      && log.pace_3x100_breaststroke_seconds === null
      && log.pace_3x100_freestyle_seconds !== null
      && log.pace_3x100_fly_seconds === null
      && log.pace_3x100_backstroke_seconds === null
      && log.pace_3x100_im_seconds === null
      && log.time_25y_seconds === null
      && log.pace_3x100_seconds === null
    )).toBe(true);
    const byAthleteWeek = new Map<string, typeof tests>();
    for (const test of tests) {
      const key = `${test.athlete_id}:${mondayOfWeek(test.activity_date)}`;
      byAthleteWeek.set(key, [...(byAthleteWeek.get(key) ?? []), test]);
    }
    let matchingWeeks = 0;
    let independentWeeks = 0;
    for (const pair of byAthleteWeek.values().filter((items) => items.length === 2)) {
      const strokeIndexes = pair.map((test) => [test.time_25y_breaststroke_seconds, test.time_25y_freestyle_seconds, test.time_25y_fly_seconds, test.time_25y_backstroke_seconds].findIndex((value) => value !== null));
      if (strokeIndexes[0] === strokeIndexes[1]) matchingWeeks += 1; else independentWeeks += 1;
    }
    expect(matchingWeeks).toBeGreaterThan(0);
    expect(independentWeeks).toBeGreaterThan(0);
    expect(new Set(tests.map((test) => test.pace_3x100_freestyle_seconds)).size).toBeGreaterThanOrEqual(20);
    expect(new Set(logs.flatMap((entry) => entry.rpe === null ? [] : [entry.rpe])).size).toBeGreaterThanOrEqual(5);
    expect(new Set(logs.flatMap((entry) => entry.fatigue === null ? [] : [entry.fatigue])).size).toBeGreaterThanOrEqual(5);
  });
});
