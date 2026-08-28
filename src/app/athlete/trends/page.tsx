import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
import { buildDashboardData } from "@/lib/analytics";
import { getLogs } from "@/lib/data";
import { getAppProfileForRole } from "@/lib/session";

export const metadata: Metadata = { title: "My trends" };

export default async function AthleteTrendsPage() {
  const profile = await getAppProfileForRole(["athlete"], "athlete");
  const data = buildDashboardData(await getLogs(profile));
  return <div className="space-y-6"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Personal analytics</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Your trends</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#607181]">Toggle comparable measures, look for patterns across several days, and leave missing measurements empty.</p></div><Dashboard data={data} /></div>;
}
