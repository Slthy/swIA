import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { durationInMinutes, durationInSeconds, LogForm, sleepDurationInHours } from "@/components/log-form";

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
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Sleep duration hours" }), { target: { value: "7" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Sleep duration minutes" }), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(mocks.saveLog).toHaveBeenCalledWith(expect.objectContaining({ sleepHours: 7.5 })));
  });

  it("keeps sleep optional when both duration fields are blank", () => {
    expect(sleepDurationInHours("", "")).toBeNull();
    expect(sleepDurationInHours("", "45")).toBe(0.75);
  });

  it("converts paired minute and second swim inputs to stored seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T16:00:00.000Z"));
    render(<LogForm initialSession="friday_am_test" />);
    await act(async () => { await vi.runAllTimersAsync(); });
    vi.useRealTimers();

    fireEvent.change(screen.getByRole("combobox", { name: "25y stroke" }), { target: { value: "freestyle" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Freestyle time minutes" }), { target: { value: "0" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Freestyle time seconds" }), { target: { value: "11.25" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Freestyle average pace minutes" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Freestyle average pace seconds" }), { target: { value: "5.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(mocks.saveLog).toHaveBeenCalledWith(expect.objectContaining({
      time25yFreestyleSeconds: 11.25,
      pace3x100FreestyleSeconds: 65.5,
    })));
  });

  it("converts paired minute and second HR-zone inputs to stored decimal minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T16:00:00.000Z"));
    render(<LogForm />);
    await act(async () => { await vi.runAllTimersAsync(); });
    vi.useRealTimers();

    fireEvent.change(screen.getByRole("combobox", { name: "Available session" }), { target: { value: "tuesday_am_swim" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 1 minutes" }), { target: { value: "37" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 1 seconds" }), { target: { value: "40" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 2 minutes" }), { target: { value: "9" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 2 seconds" }), { target: { value: "12" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 3 minutes" }), { target: { value: "8" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 3 seconds" }), { target: { value: "52" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 4 minutes" }), { target: { value: "22" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 4 seconds" }), { target: { value: "45" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 5 minutes" }), { target: { value: "5" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Zone 5 seconds" }), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    await waitFor(() => expect(mocks.saveLog).toHaveBeenCalledWith(expect.objectContaining({
      zone1Minutes: 37 + 40 / 60,
      zone2Minutes: 9.2,
      zone3Minutes: 8 + 52 / 60,
      zone4Minutes: 22.75,
      zone5Minutes: 5 + 11 / 60,
    })));
  });

  it("keeps empty paired durations optional", () => {
    expect(durationInMinutes("", "")).toBeNull();
    expect(durationInMinutes("37", "40")).toBeCloseTo(37.67, 2);
    expect(durationInSeconds("", "")).toBeNull();
    expect(durationInSeconds("1", "7.25")).toBe(67.25);
  });
});
