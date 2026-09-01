import React from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PwaRegistration } from "@/components/pwa-registration";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), register: vi.fn().mockResolvedValue(undefined) }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

describe("PwaRegistration data freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: mocks.register } });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("refreshes server data after an installed app returns from the background", () => {
    render(<PwaRegistration />);
    expect(mocks.register).toHaveBeenCalledWith("/sw.js");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes a page restored from the browser back-forward cache", () => {
    render(<PwaRegistration />);
    const event = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(event, "persisted", { value: true });
    act(() => window.dispatchEvent(event));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
