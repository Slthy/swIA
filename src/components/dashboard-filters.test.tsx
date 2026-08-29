import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardFilters } from "@/components/dashboard-filters";

const athletes = [{ id: "00000000-0000-4000-8000-000000000001", displayName: "Alex Athlete", username: "alex.athlete", teamCategory: "unassigned" as const, active: true }];
const groups = [{ id: "00000000-0000-4000-8000-000000000002", name: "Sprint", color: "#ef6a67", athleteIds: [athletes[0].id] }];

describe("dashboard timeframe filters", () => {
  it("reveals and constrains custom dates immediately", () => {
    render(<DashboardFilters athletes={athletes} groups={groups} values={{ scope: "all", range: "month", from: "2026-07-30", to: "2026-08-28" }} />);
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Timeframe"), { target: { value: "custom" } });
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    expect(from).toHaveValue("2026-07-30");
    expect(to).toHaveValue("2026-08-28");
    expect(from).toHaveAttribute("max", "2026-08-28");
    expect(to).toHaveAttribute("min", "2026-07-30");
  });

  it("reveals category selection without a preliminary submit", () => {
    render(<DashboardFilters athletes={athletes} groups={groups} values={{ scope: "all", range: "month" }} />);
    fireEvent.change(screen.getByLabelText("View"), { target: { value: "group" } });
    expect(screen.getByLabelText("Category")).toHaveTextContent("Sprint");
  });
});
