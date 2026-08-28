import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronRight, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SESSION_LABELS } from "@/lib/constants";
import { getLogs } from "@/lib/data";
import { getAppProfileForRole } from "@/lib/session";

export const metadata: Metadata = { title: "Entry history" };

export default async function AthleteHistoryPage() {
  const profile = await getAppProfileForRole(["athlete"], "athlete");
  const logs = (await getLogs(profile)).sort((a, b) => b.activityDate.localeCompare(a.activityDate));
  return <div className="space-y-6"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Your records</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Entry history</h1><p className="mt-2 text-sm text-[#607181]">Activity dates drive your charts; submission times are retained separately.</p></div><Card className="overflow-hidden">{logs.length ? <div className="divide-y divide-[#e5ecef]">{logs.map((log) => <Link key={log.id} href={`/athlete/log?session=${log.sessionKey}`} className="flex min-h-18 items-center gap-4 px-4 py-4 transition hover:bg-[#f7fafb] sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f5] text-[#0a6f7e]"><History className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#17384d]">{SESSION_LABELS[log.sessionKey]}</span><span className="mt-1 block text-xs text-[#82929d]">{format(parseISO(log.activityDate), "EEEE, MMMM d, yyyy")} · {log.dateSource.replaceAll("_", " ")}</span></span><ChevronRight className="size-4 text-[#a0afb8]" /></Link>)}</div> : <div className="p-12 text-center text-sm text-[#718491]">No entries yet.</div>}</Card></div>;
}
