import { describe, expect, it } from "vitest";
import { isSessionAllowedForDate, sessionsForDate, toLocalISODate } from "@/lib/dates";

describe("date-gated session options", () => {
  it.each([
    ["2026-08-23", ["daily_wellness"]],
    ["2026-08-24", ["daily_wellness", "monday_am_test", "monday_lift", "monday_pm_swim"]],
    ["2026-08-25", ["daily_wellness", "tuesday_am_swim", "tuesday_lift"]],
    ["2026-08-26", ["daily_wellness", "wednesday_am_swim", "wednesday_pm_swim"]],
    ["2026-08-27", ["daily_wellness", "thursday_am_swim", "thursday_lift"]],
    ["2026-08-28", ["daily_wellness", "friday_am_test", "friday_pm_swim"]],
    ["2026-08-29", ["daily_wellness", "saturday_am_swim"]],
  ])("returns only scheduled sessions for %s", (date, sessions) => expect(sessionsForDate(date)).toEqual(sessions));

  it("never allows Monday AM on Tuesday", () => expect(isSessionAllowedForDate("monday_am_test", "2026-08-25")).toBe(false));
  it("formats with the device-local calendar date", () => expect(toLocalISODate(new Date(2026, 7, 28, 23, 55))).toBe("2026-08-28"));
});
