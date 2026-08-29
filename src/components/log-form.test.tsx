import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogForm } from "@/components/log-form";

vi.mock("@/app/actions/logs", () => ({ saveLog: vi.fn() }));

afterEach(() => vi.useRealTimers());

describe("LogForm", () => {
  it("keeps a valid deep-linked test session after the device date loads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T16:00:00.000Z"));
    render(<LogForm initialSession="friday_am_test" preview />);
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(screen.getByRole("combobox", { name: "Available session" })).toHaveValue("friday_am_test");
    expect(screen.getByText("25y time by stroke", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("3×100 average pace by stroke", { exact: false })).toBeInTheDocument();
  });
});
