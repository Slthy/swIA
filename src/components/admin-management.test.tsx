import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminAccountsTable } from "@/components/admin-accounts-table";
import { StaffEntriesTable } from "@/components/staff-entries-table";
import type { AthleteLog } from "@/lib/types";

vi.mock("@/app/actions/logs", () => ({ bulkSoftDeleteLogsAction: vi.fn() }));
vi.mock("@/app/admin/actions", () => ({
  deleteAccountsAction: vi.fn(),
  toggleAccountAction: vi.fn(),
  updateAccountPasswordAction: vi.fn(),
}));

const log: AthleteLog = {
  id: "00000000-0000-4000-8000-000000000010", athleteId: "00000000-0000-4000-8000-000000000011", athleteName: "Test Swimmer",
  logType: "practice", sessionKey: "tuesday_am_swim", activityDate: "2026-08-25", dateSource: "device",
  deviceRecordedAt: null, deviceTimezone: null, deviceUtcOffsetMinutes: null, soreness: null, academicStress: null, nutrition: null,
  restingHr: null, sleepHours: null, rpe: 7, fatigue: 6, pace3x100Seconds: null, time25ySeconds: null,
  time25yBreaststrokeSeconds: null, time25yFreestyleSeconds: null, time25yFlySeconds: null, time25yBackstrokeSeconds: null,
  pace3x100BreaststrokeSeconds: null, pace3x100FreestyleSeconds: null, pace3x100FlySeconds: null,
  pace3x100BackstrokeSeconds: null, pace3x100ImSeconds: null, kickCount: null, strokeCount: null,
  zone1Minutes: null, zone2Minutes: null, zone3Minutes: null, zone4Minutes: null, zone5Minutes: null,
  createdAt: "2026-08-25T12:00:00Z", updatedAt: "2026-08-25T12:00:00Z",
};

describe("admin selection controls", () => {
  it("lets an administrator select entries for bulk deletion", () => {
    render(<StaffEntriesTable logs={[log]} canDelete />);
    const deleteButton = screen.getByRole("button", { name: "Delete selected" });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Test Swimmer/ }));
    expect(deleteButton).toBeEnabled();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("protects the current admin while exposing password and account selection controls", () => {
    render(<AdminAccountsTable currentAccountId="00000000-0000-4000-8000-000000000001" accounts={[
      { id: "00000000-0000-4000-8000-000000000001", displayName: "Current Admin", username: "coach.admin", role: "admin", active: true },
      { id: "00000000-0000-4000-8000-000000000002", displayName: "Athlete One", username: "athlete.one", role: "athlete", active: true },
    ]} />);
    expect(screen.getByRole("checkbox", { name: "Select account Current Admin" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select account Athlete One" }));
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeEnabled();
    expect(screen.getByLabelText("New password for Athlete One")).toHaveAttribute("pattern", "[0-9]{6}");
  });
});
