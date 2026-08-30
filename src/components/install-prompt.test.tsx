import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectInstallPlatform, InstallPrompt } from "@/components/install-prompt";

const androidChrome = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const androidSamsung = "Mozilla/5.0 (Linux; Android 15; SM-S938U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36";
const iphoneSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1";

beforeEach(() => {
  localStorage.clear();
  setUserAgent(androidChrome);
  setStandalone(false);
});

describe("InstallPrompt", () => {
  it("recognizes Android Chrome and shows the manual home-screen fallback", async () => {
    render(<InstallPrompt />);
    expect(await screen.findByText(/In Google Chrome/)).toHaveTextContent("Add to Home screen");
    expect(screen.queryByRole("button", { name: "Install app" })).not.toBeInTheDocument();
  });

  it("uses Chrome's native install prompt when Android makes it available", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    render(<InstallPrompt />);
    await screen.findByText(/In Google Chrome/);
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    act(() => window.dispatchEvent(event));

    fireEvent.click(await screen.findByRole("button", { name: "Install app" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText(/In Google Chrome/)).not.toBeInTheDocument());
    expect(localStorage.getItem("gw-swimtrack-install-dismissed")).toBe("true");
  });

  it("directs Android users in another browser to open Google Chrome", async () => {
    setUserAgent(androidSamsung);
    render(<InstallPrompt />);
    expect(await screen.findByText(/Open this page in/)).toHaveTextContent("Google Chrome");
  });

  it("keeps the existing Safari instructions on iOS and hides when installed", async () => {
    setUserAgent(iphoneSafari);
    const { unmount } = render(<InstallPrompt />);
    expect(await screen.findByText(/In Safari/)).toHaveTextContent("Add to Home Screen");
    unmount();

    setStandalone(true);
    render(<InstallPrompt />);
    await waitFor(() => expect(screen.queryByText(/Add GW SwimTrack/)).not.toBeInTheDocument());
  });
});

describe("detectInstallPlatform", () => {
  it("does not mistake other Android Chromium browsers for Google Chrome", () => {
    expect(detectInstallPlatform(androidChrome)).toBe("android-chrome");
    expect(detectInstallPlatform(androidSamsung)).toBe("android-other");
    expect(detectInstallPlatform("Mozilla/5.0 (Linux; Android 15) Chrome/140.0.0.0 Mobile EdgA/140.0.0.0")).toBe("android-other");
  });
});

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: userAgent });
}

function setStandalone(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}
