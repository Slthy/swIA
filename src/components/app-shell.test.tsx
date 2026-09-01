import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import type { Profile } from "@/lib/types";

vi.mock("@/components/pwa-registration", () => ({ PwaRegistration: () => null }));
vi.mock("@/app/login/actions", () => ({ signOutAction: vi.fn() }));

const athlete: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "alessandro.borsato",
  displayName: "Alessandro Borsato",
  role: "athlete",
  teamCategory: "men",
  groupIds: [],
};

describe("AppShell mobile safe areas", () => {
  it("uses the notch-safe header, compact first name, safe main, and home-indicator-aware nav", () => {
    render(<AppShell profile={athlete} preview={false}><p>Dashboard content</p></AppShell>);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("mobile-top-header");
    expect(within(header).getByText("Alessandro")).toBeInTheDocument();
    expect(within(header).queryByText("Alessandro Borsato")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard content").closest("main")).toHaveClass("mobile-safe-main");
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toHaveClass("mobile-bottom-nav");
  });
});
