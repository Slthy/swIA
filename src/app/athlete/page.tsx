import Link from "next/link";
import { ArrowRight, Waves } from "lucide-react";
import { Dashboard } from "@/components/dashboard";
import { InstallPrompt } from "@/components/install-prompt";
import { TodayActions } from "@/components/today-actions";
import { Card } from "@/components/ui/card";
import { buildDashboardData } from "@/lib/analytics";
import { getLogs } from "@/lib/data";
import { getAppProfileForRole } from "@/lib/session";

export default async function AthleteHomePage() {
  const profile = await getAppProfileForRole(["athlete"], "athlete");
  const logs = await getLogs(profile);
  const dashboard = buildDashboardData(logs, { scope: "individual" });
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[1.6rem] bg-[#0a304a] px-6 py-7 text-white sm:px-8 sm:py-9">
      <div className="fine-grid absolute inset-0 opacity-50" />
      <div className="relative flex items-start justify-between gap-6"><div><p className="text-sm font-semibold text-[#ddcfb1]">Your training picture</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Welcome back, {profile.displayName.split(" ")[0]}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/65">Log what happened today, then use the trends—not a single score—to understand how your work is landing.</p></div><span className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-white/8 sm:grid"><Waves className="size-7 text-[#55c5cf]" /></span></div>
    </section>
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section><div className="mb-4 flex items-center justify-between"><div><p className="text-[.68rem] font-bold uppercase tracking-[.14em] text-[#8d7448]">Device-local schedule</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em] text-[#17384d]">Today’s check-ins</h2></div><Link href="/athlete/log" className="flex items-center gap-1 text-xs font-bold text-[#0a6f7e]">Log another date <ArrowRight className="size-3.5" /></Link></div><TodayActions logs={logs} /></section>
      <div className="space-y-5"><InstallPrompt /><Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[.68rem] font-bold uppercase tracking-[.14em] text-[#8d7448]">At a glance</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em] text-[#17384d]">Recent performance</h2></div><Link href="/athlete/trends" className="text-xs font-bold text-[#0a6f7e]">See all trends</Link></div></Card></div>
    </div>
    <Dashboard data={dashboard} compact />
  </div>;
}
