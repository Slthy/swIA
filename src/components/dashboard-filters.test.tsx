import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardFilters } from "@/components/dashboard-filters";

const athletes = [{ id: "00000000-0000-4000-8000-000000000001", displayName: "Alex Athlete", username: "alex.athlete", teamCategory: "unassigned" as const, active: true }];
const groups = [{ id: "00000000-0000-4000-8000-000000000002", name: "Sprint", color: "#ef6a67", athleteIds: [athletes[0].id] }];

describe("dashboard timeframe filters", () => {
  it("reveals and constrains custom dates immediately", () => {
    render(<DashboardFilters athletes={athletes} groups={groups} windowOptionsWeeks={[4, 8, 12]} values={{ subject: "team", segment: "all", range: "4w", from: "2026-07-30", to: "2026-08-28" }} />);
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Timeframe"), { target: { value: "custom" } });
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    expect(from).toHaveValue("2026-07-30");
    expect(to).toHaveValue("2026-08-28");
    expect(from).toHaveAttribute("max", "2026-08-28");
    expect(to).toHaveAttribute("min", "2026-07-30");
  });

  it("switches the whole dashboard between team and individual subjects", () => {
    render(<DashboardFilters athletes={athletes} groups={groups} windowOptionsWeeks={[4, 8, 12]} values={{ subject: "team", segment: "all", range: "4w" }} />);
    expect(screen.getByLabelText("Trend subject")).toHaveTextContent("General team trends");
    expect(screen.getByLabelText("Team segment")).toHaveTextContent("Sprint");
    fireEvent.change(screen.getByLabelText("Trend subject"), { target: { value: athletes[0].id } });
    expect(screen.queryByLabelText("Team segment")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Trend subject")).toHaveValue(athletes[0].id);
  });
});
