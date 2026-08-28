"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, ClipboardPlus } from "lucide-react";
import { SESSION_LABELS } from "@/lib/constants";
import { getDeviceDateContext, sessionsForDate } from "@/lib/dates";
import type { AthleteLog } from "@/lib/types";

export function TodayActions({ logs }: { logs: AthleteLog[] }) {
  const [activityDate, setActivityDate] = useState<string | null>(null);
  useEffect(() => setActivityDate(getDeviceDateContext().activityDate), []);
  if (!activityDate) return <div className="h-48 animate-pulse rounded-2xl bg-[#e9eff1]" />;
  const sessions = sessionsForDate(activityDate);
  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const complete = logs.some((log) => log.activityDate === activityDate && log.sessionKey === session);
        return <Link key={session} href={`/athlete/log?session=${session}`} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-[#dce5e9] bg-white px-4 transition hover:border-[#b9cbd3] hover:shadow-sm"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${complete ? "bg-emerald-50 text-emerald-700" : "bg-[#eef5f6] text-[#0a6072]"}`}>{complete ? <Check className="size-4" /> : <ClipboardPlus className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#17384d]">{SESSION_LABELS[session]}</span><span className="mt-1 block text-xs text-[#82929d]">{complete ? "Completed · tap to review" : "Ready to log"}</span></span><ChevronRight className="size-4 text-[#a0afb8] transition group-hover:translate-x-0.5" /></Link>;
      })}
    </div>
  );
}
