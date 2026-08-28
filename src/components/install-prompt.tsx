"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem("gw-swimtrack-install-dismissed") === "true");
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || (!isIOS && !installEvent)) return null;
  const dismiss = () => {
    localStorage.setItem("gw-swimtrack-install-dismissed", "true");
    setDismissed(true);
  };
  return (
    <aside className="install-only relative overflow-hidden rounded-2xl bg-[#0a304a] p-5 text-white shadow-lg shadow-[#0a304a]/15">
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Dismiss installation tip"><X className="size-4" /></button>
      <div className="flex gap-4 pr-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10"><Download className="size-5 text-[#ddcfb1]" /></span>
        <div>
          <p className="font-semibold">Add GW SwimTrack to your Home Screen</p>
          {isIOS ? <p className="mt-1 text-sm leading-6 text-white/65">In Safari, tap <Share className="mx-1 inline size-4" /> Share, then <strong className="text-white">Add to Home Screen</strong>.</p> : <Button className="mt-3 bg-white text-[#0a304a] hover:bg-[#edf4f5]" onClick={async () => { await installEvent?.prompt(); dismiss(); }}>Install app</Button>}
        </div>
      </div>
    </aside>
  );
}
