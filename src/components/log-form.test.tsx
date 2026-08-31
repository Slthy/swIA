import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogForm, sleepDurationInHours } from "@/components/log-form";

const mocks = vi.hoisted(() => ({ saveLog: vi.fn() }));

vi.mock("@/app/actions/logs", () => ({ saveLog: mocks.saveLog }));

afterEach(() => vi.useRealTimers());

describe("LogForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveLog.mockResolvedValue({ status: "saved" });
  });

  it("keeps a valid deep-linked test session after the device date loads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T16:00:00.000Z"));
    render(<LogForm initialSession="friday_am_test" preview />);
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(screen.getByRole("combobox", { name: "Available session" })).toHaveValue("friday_am_test");
    expect(screen.getByText("25y time by stroke", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("3×100 freestyle average pace", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "25y stroke" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "25y stroke" })).toBeEnabled();
  });

  it("accepts sleep as separate hours and minutes and saves decimal hours", async () => {
    render(<LogForm />);
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Sleep hours" }), { target: { value: "7" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Sleep minutes" }), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(mocks.saveLog).toHaveBeenCalledWith(expect.objectContaining({ sleepHours: 7.5 })));
  });

  it("keeps sleep optional when both duration fields are blank", () => {
    expect(sleepDurationInHours("", "")).toBeNull();
    expect(sleepDurationInHours("", "45")).toBe(0.75);
  });
});
