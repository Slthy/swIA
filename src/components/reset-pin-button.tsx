"use client";

import { useState, useTransition } from "react";
import { resetAthletePinAction } from "@/app/admin/actions";

export function ResetPinButton({ userId }: { userId: string }) {
  const [pin, setPin] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <div className="flex items-center gap-2">{pin && <code className="rounded bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-800">{pin}</code>}<button type="button" disabled={pending} onClick={() => { if (!window.confirm("Generate a new six-digit PIN? The old PIN will stop working immediately.")) return; startTransition(async () => setPin(await resetAthletePinAction(userId))); }} className="rounded-lg border border-[#d4dfe4] px-3 py-2 text-xs font-semibold text-[#304a5d] disabled:opacity-50">{pending ? "Resetting…" : "Reset PIN"}</button></div>;
}
