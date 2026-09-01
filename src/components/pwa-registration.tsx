"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PwaRegistration() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    let wasHidden = false;
    let lastRefresh = Date.now();
    const refresh = (force = false) => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastRefresh < 15_000) return;
      lastRefresh = now;
      router.refresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
        return;
      }
      if (wasHidden) {
        wasHidden = false;
        refresh(true);
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh(true);
    };
    const onFocus = () => refresh();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}
