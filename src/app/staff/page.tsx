import Link from "next/link";
import { subDays } from "date-fns";
import { ArrowUpRight, Users } from "lucide-react";
import { Dashboard } from "@/components/dashboard";
import { DashboardFilters } from "@/components/dashboard-filters";
import { Card } from "@/components/ui/card";
import { buildDashboardData } from "@/lib/analytics";
import { getAthletes, getGroups, getLogs } from "@/lib/data";
import { toLocalISODate } from "@/lib/dates";
import { getAppProfileForRole } from "@/lib/session";

interface StaffSearch { scope?: string; athlete?: string; group?: string; range?: string; from?: string; to?: string }

export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<StaffSearch> }) {
  const profile = await getAppProfileForRole(["coach", "admin"], "staff");
  const params = await searchParams;
  const scope = ["all", "men", "women", "group", "individual"].includes(params.scope ?? "") ? params.scope! : "all";
  const range = ["week", "month", "all", "custom"].includes(params.range ?? "") ? params.range! : "month";
  const today = new Date();
  const from = range === "week" ? toLocalISODate(subDays(today, 6)) : range === "month" ? toLocalISODate(subDays(today, 29)) : range === "custom" ? params.from : undefined;
  const to = range === "custom" ? params.to : range === "all" ? undefined : toLocalISODate(today);
  const [athletes, groups, allLogs] = await Promise.all([getAthletes(), getGroups(), getLogs(profile, { from, to })]);
  const group = groups.find((item) => item.id === params.group);
  const eligibleIds = new Set(scope === "individual" && params.athlete ? [params.athlete] : scope === "group" ? group?.athleteIds ?? [] : scope === "men" || scope === "women" ? athletes.filter((athlete) => athlete.teamCategory === scope).map((athlete) => athlete.id) : athletes.map((athlete) => athlete.id));
  const logs = allLogs.filter((log) => eligibleIds.has(log.athleteId));
  const data = buildDashboardData(logs);
  const title = scope === "individual" ? athletes.find((item) => item.id === params.athlete)?.displayName ?? "Select an athlete" : scope === "group" ? group?.name ?? "Select a group" : scope === "men" ? "Men’s team" : scope === "women" ? "Women’s team" : "Whole team";
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Staff performance view</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">{title}</h1><p className="mt-2 text-sm text-[#607181]">Balanced athlete-day analytics across the selected scope and period.</p></div><Link href="/staff/log" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0a304a] px-4 text-sm font-semibold text-white">Log for athlete <ArrowUpRight className="size-4" /></Link></div><DashboardFilters athletes={athletes} groups={groups} values={{ scope, athlete: params.athlete, group: params.group, range, from, to }} />{logs.length === 0 && <Card className="flex items-center gap-3 border-[#dccba8] bg-[#fffaf0] p-4 text-sm text-[#705a32]"><Users className="size-4" />No logs match these filters. Missing measurements will not be represented as zero.</Card>}<Dashboard data={data} /></div>;
}
