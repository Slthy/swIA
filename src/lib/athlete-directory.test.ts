import { describe, expect, it } from "vitest";
import { filterAndSortAthletes } from "@/lib/athlete-directory";
import type { AthleteListItem } from "@/lib/data";

const athletes: AthleteListItem[] = [
  { id: "1", displayName: "Zara Sprint", username: "zara.sprint", teamCategory: "women", active: true },
  { id: "2", displayName: "Aaron Distance", username: "aaron.distance", teamCategory: "men", active: true },
  { id: "3", displayName: "Casey Mid-D", username: "casey.midd", teamCategory: "unassigned", active: true },
  { id: "4", displayName: "Bella Sprint", username: "bella.sprint", teamCategory: "women", active: true },
];

describe("filterAndSortAthletes", () => {
  it("filters by gender and searches names and usernames", () => {
    expect(filterAndSortAthletes(athletes, { gender: "women" }).map((athlete) => athlete.id)).toEqual(["4", "1"]);
    expect(filterAndSortAthletes(athletes, { query: "midd" }).map((athlete) => athlete.id)).toEqual(["3"]);
  });

  it("sorts by gender with unassigned athletes last, then by name", () => {
    expect(filterAndSortAthletes(athletes, { sort: "gender" }).map((athlete) => athlete.id)).toEqual(["4", "1", "2", "3"]);
  });

  it("falls back to all genders and name order for invalid values", () => {
    expect(filterAndSortAthletes(athletes, { gender: "invalid", sort: "invalid" }).map((athlete) => athlete.id)).toEqual(["2", "4", "3", "1"]);
  });
});
