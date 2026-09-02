import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EffortOutlierWatchlist } from "@/components/effort-outlier-watchlist";
import type { EffortOutlier } from "@/lib/types";

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

  it("expands all signals and can return to the compact eight-item view", () => {
    const outliers: EffortOutlier[] = Array.from({ length: 10 }, (_, index) => ({
      date: "2026-09-01",
      sessionKey: "tuesday_am_swim",
      athleteId: `athlete-${index + 1}`,
      athleteName: `Athlete ${index + 1}`,
      rpe: { athleteValue: 9, peerMedian: 7, difference: 2, peerCount: 12 },
      fatigue: null,
    }));
    render(<EffortOutlierWatchlist outliers={outliers} />);

    expect(screen.getByText("Athlete 8")).toBeInTheDocument();
    expect(screen.queryByText("Athlete 9")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all 10" }));
    expect(screen.getByText("Athlete 9")).toBeInTheDocument();
    expect(screen.getByText("Athlete 10")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.queryByText("Athlete 9")).not.toBeInTheDocument();
  });
});
