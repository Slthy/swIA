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

  it("switches 25y progression between best improvement and fastest time", () => {
    render(<SwimTestChart data={[]} weekly25y={[{
      weekStart: "2026-08-24",
      stroke: "breaststroke",
      athleteId: "athlete-a",
      athleteName: "Athlete A",
      mondaySeconds: 14.2,
      fridaySeconds: 14,
      deltaSeconds: -0.2,
    }]} />);
    const best = screen.getByRole("button", { name: "Best improvement" });
    const fastest = screen.getByRole("button", { name: "Fastest time" });
    expect(best).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(fastest);
    expect(best).toHaveAttribute("aria-pressed", "false");
    expect(fastest).toHaveAttribute("aria-pressed", "true");
  });
});
