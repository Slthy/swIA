import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HrZoneChart } from "@/components/charts/hr-zone-chart";
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
});
