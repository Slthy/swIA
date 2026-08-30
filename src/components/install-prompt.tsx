"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallPlatform = "ios" | "android-chrome" | "android-other" | "other";

const dismissedKey = "gw-swimtrack-install-dismissed";

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const displayMode = window.matchMedia?.("(display-mode: standalone)");
    const updateStandalone = () => setIsStandalone(isAppInstalled(displayMode));
    setDismissed(localStorage.getItem(dismissedKey) === "true");
    setPlatform(detectInstallPlatform(navigator.userAgent));
    updateStandalone();

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const handleInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode?.addEventListener?.("change", updateStandalone);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode?.removeEventListener?.("change", updateStandalone);
    };
  }, []);

  const isIOS = platform === "ios";
  const isAndroid = platform === "android-chrome" || platform === "android-other";
  if (dismissed || isStandalone || (!isIOS && !isAndroid && !installEvent)) return null;
  const dismiss = () => {
    localStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  };
  const install = async () => {
    if (!installEvent) return;
    const event = installEvent;
    await event.prompt();
    const choice = await event.userChoice;
    setInstallEvent(null);
    if (choice.outcome === "accepted") dismiss();
  };
  return (
    <aside className="install-only relative overflow-hidden rounded-2xl bg-[#0a304a] p-5 text-white shadow-lg shadow-[#0a304a]/15">
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Dismiss installation tip"><X className="size-4" /></button>
      <div className="flex gap-4 pr-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10"><Download className="size-5 text-[#ddcfb1]" /></span>
        <div>
          <p className="font-semibold">Add GW SwimTrack to your Home Screen</p>
          {isIOS && <p className="mt-1 text-sm leading-6 text-white/65">In Safari, tap <Share className="mx-1 inline size-4" /> Share, then <strong className="text-white">Add to Home Screen</strong>.</p>}
          {platform === "android-chrome" && <p className="mt-1 text-sm leading-6 text-white/65">In Google Chrome, tap <strong className="text-white">Install app</strong>{installEvent ? " below" : " from the ⋮ menu"}. If that option is not shown, choose <strong className="text-white">Add to Home screen</strong>.</p>}
          {platform === "android-other" && <p className="mt-1 text-sm leading-6 text-white/65">Open this page in <strong className="text-white">Google Chrome</strong>, tap the ⋮ menu, then choose <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.</p>}
          {!isIOS && !isAndroid && installEvent && <p className="mt-1 text-sm leading-6 text-white/65">Install the app for quicker access and a full-screen experience.</p>}
          {installEvent && platform !== "android-other" && <Button className="mt-3 bg-white text-[#0a304a] hover:bg-[#edf4f5]" onClick={install}>Install app</Button>}
        </div>
      </div>
    </aside>
  );
}

export function detectInstallPlatform(userAgent: string): InstallPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (!/android/i.test(userAgent)) return "other";
  const isGoogleChrome = /chrome\//i.test(userAgent)
    && !/edga\/|opr\/|opera|samsungbrowser\/|; wv\)/i.test(userAgent);
  return isGoogleChrome ? "android-chrome" : "android-other";
}

function isAppInstalled(displayMode?: MediaQueryList): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return Boolean(displayMode?.matches)
    || Boolean(navigatorWithStandalone.standalone)
    || document.referrer.startsWith("android-app://");
}
