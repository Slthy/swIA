import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccountsTable } from "@/components/admin-accounts-table";
import { AthleteGroupAssignment } from "@/components/athlete-group-assignment";
import { StaffEntriesTable } from "@/components/staff-entries-table";
import type { AthleteLog } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  bulkDelete: vi.fn(),
  deleteAccounts: vi.fn(),
  refresh: vi.fn(),
  setGroups: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/actions/logs", () => ({ bulkSoftDeleteLogsAction: mocks.bulkDelete }));
vi.mock("@/app/admin/actions", () => ({
  deleteAccountsAction: mocks.deleteAccounts,
  setAthleteGroupsAction: mocks.setGroups,
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.bulkDelete.mockResolvedValue({ error: null, success: "1 entry moved to Deleted logs." });
    mocks.deleteAccounts.mockResolvedValue({ error: null, success: "1 account deleted." });
    mocks.setGroups.mockResolvedValue({ error: null, success: "Training groups updated." });
  });

  it("deletes the exact selected entries and refreshes the table", async () => {
    render(<StaffEntriesTable logs={[log]} canDelete />);
    const deleteButton = screen.getByRole("button", { name: "Delete selected" });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Test Swimmer/ }));
    expect(deleteButton).toBeEnabled();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.bulkDelete).toHaveBeenCalledWith([log.id]));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(await screen.findByText("1 entry moved to Deleted logs.")).toBeInTheDocument();
  });

  it("protects the current admin and deletes the selected athlete account", async () => {
    const athleteId = "00000000-0000-4000-8000-000000000002";
    render(<AdminAccountsTable currentAccountId="00000000-0000-4000-8000-000000000001" accounts={[
      { id: "00000000-0000-4000-8000-000000000001", displayName: "Current Admin", username: "coach.admin", role: "admin", active: true },
      { id: athleteId, displayName: "Athlete One", username: "athlete.one", role: "athlete", active: true },
    ]} />);
    expect(screen.getByRole("checkbox", { name: "Select account Current Admin" })).toBeDisabled();
    const deleteButton = screen.getByRole("button", { name: "Delete selected" });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select account Athlete One" }));
    expect(deleteButton).toBeEnabled();
    expect(screen.getByLabelText("New password for Athlete One")).toHaveAttribute("pattern", "[0-9]{6}");
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.deleteAccounts).toHaveBeenCalledWith([athleteId]));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("entries and training-group assignments will also be permanently deleted"));
    expect(await screen.findByText("1 account deleted.")).toBeInTheDocument();
  });

  it("uses clear group toggles and saves the full assignment", async () => {
    const athleteId = "00000000-0000-4000-8000-000000000002";
    const sprintId = "00000000-0000-4000-8000-000000000021";
    const distanceId = "00000000-0000-4000-8000-000000000022";
    render(<AthleteGroupAssignment
      athleteId={athleteId}
      athleteName="Athlete One"
      selectedGroupIds={[sprintId]}
      groups={[
        { id: sprintId, name: "Sprint", color: "#bf4545", athleteIds: [athleteId] },
        { id: distanceId, name: "Distance", color: "#0a6f7e", athleteIds: [] },
      ]}
    />);
    expect(screen.getByRole("button", { name: /Sprint/ })).toHaveAttribute("aria-pressed", "true");
    const save = screen.getByRole("button", { name: "Save groups" });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Distance/ }));
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(mocks.setGroups).toHaveBeenCalledWith(athleteId, [sprintId, distanceId]));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });
});
