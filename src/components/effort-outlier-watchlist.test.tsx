import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EffortOutlierWatchlist } from "@/components/effort-outlier-watchlist";

describe("EffortOutlierWatchlist", () => {
  it("offers an independent watchlist timespan while preserving dashboard filters", () => {
    const { container } = render(<EffortOutlierWatchlist
      outliers={[]}
      windowControl={{
        days: 14,
        options: [7, 14, 28, 56],
        preservedFilters: { subject: "team", segment: "women", range: "4w" },
      }}
    />);

    expect(screen.getByLabelText("Watchlist timespan")).toHaveValue("14");
    expect(screen.getByRole("option", { name: "Last 56 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(container.querySelector('input[name="segment"]')).toHaveValue("women");
    expect(screen.getAllByText(/last 14 days/i)).toHaveLength(2);
  });
});
