import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HrZoneChart } from "@/components/charts/hr-zone-chart";
import { SessionEffortChart } from "@/components/charts/session-effort-chart";
import { SwimTestChart } from "@/components/charts/swim-test-chart";
import { WellnessChart } from "@/components/charts/wellness-chart";

describe("chart visibility controls", () => {
  it("toggles all shared-scale wellness metrics independently", () => {
    render(<WellnessChart data={[{ date: "2026-08-28", soreness: 4, academicStress: 5, nutrition: 8 }]} />);
    const stress = screen.getByRole("button", { name: "Academic stress" });
    expect(stress).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(stress);
    expect(stress).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an instruction after every HR zone is disabled", () => {
    render(<HrZoneChart data={[{ date: "2026-08-28", zone1: 5, zone2: 10, zone3: 15, zone4: 5, zone5: 2 }]} />);
    for (const zone of [1, 2, 3, 4, 5]) fireEvent.click(screen.getByRole("button", { name: `Zone ${zone}` }));
    expect(screen.getByText("Select at least one HR zone.")).toBeInTheDocument();
  });

  it("toggles RPE and post-session fatigue on the shared effort chart", () => {
    render(<SessionEffortChart data={[{ date: "2026-08-28", sessionKey: "friday_am_test", rpe: 8, fatigue: 6 }]} />);
    const fatigue = screen.getByRole("button", { name: "Post-session fatigue" });
    expect(fatigue).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(fatigue);
    expect(fatigue).toHaveAttribute("aria-pressed", "false");
  });

  it("filters daily test data by day and assigned 25y stroke", () => {
    render(<SwimTestChart daily25y={[
      { date: "2026-08-24", day: "Monday", stroke: "freestyle", timeSeconds: 11, kickCount: 20, strokeCount: 32, athleteCount: 1 },
      { date: "2026-08-28", day: "Friday", stroke: "breaststroke", timeSeconds: 14, kickCount: 24, strokeCount: 38, athleteCount: 1 },
    ]} daily3x100={[
      { date: "2026-08-24", day: "Monday", paceSeconds: 64, athleteCount: 1 },
      { date: "2026-08-28", day: "Friday", paceSeconds: 63, athleteCount: 1 },
    ]} />);
    const friday = screen.getByRole("button", { name: "Friday" });
    const breaststroke = screen.getByRole("button", { name: "25y stroke filter: Breaststroke" });
    expect(friday).toHaveAttribute("aria-pressed", "true");
    expect(breaststroke).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(friday);
    expect(friday).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "25y stroke filter: Breaststroke" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("25y time stroke and kick count chart")).toBeInTheDocument();
    expect(screen.getByLabelText("3x100 freestyle pace chart")).toBeInTheDocument();
  });
});
