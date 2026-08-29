import type { AthleteListItem } from "@/lib/data";
import type { TeamCategory } from "@/lib/types";

export type AthleteGenderFilter = "all" | TeamCategory;
export type AthleteDirectorySort = "name" | "gender";

export interface AthleteDirectoryFilters {
  query?: string;
  gender?: string;
  sort?: string;
}

const categoryOrder: Record<TeamCategory, number> = {
  women: 0,
  men: 1,
  unassigned: 2,
};

export function filterAndSortAthletes(
  athletes: AthleteListItem[],
  input: AthleteDirectoryFilters,
) {
  const query = (input.query ?? "").trim().toLocaleLowerCase();
  const gender: AthleteGenderFilter = ["men", "women", "unassigned"].includes(input.gender ?? "")
    ? input.gender as TeamCategory
    : "all";
  const sort: AthleteDirectorySort = input.sort === "gender" ? "gender" : "name";

  return athletes
    .filter((athlete) => gender === "all" || athlete.teamCategory === gender)
    .filter((athlete) => !query || `${athlete.displayName} ${athlete.username}`.toLocaleLowerCase().includes(query))
    .sort((left, right) => {
      if (sort === "gender") {
        const categoryDifference = categoryOrder[left.teamCategory] - categoryOrder[right.teamCategory];
        if (categoryDifference) return categoryDifference;
      }
      return left.displayName.localeCompare(right.displayName);
    });
}
