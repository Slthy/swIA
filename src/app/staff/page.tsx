import Link from "next/link";
import { subDays } from "date-fns";
import { ArrowUpRight, Users } from "lucide-react";
import { Dashboard } from "@/components/dashboard";
import { DashboardFilters } from "@/components/dashboard-filters";
import { Card } from "@/components/ui/card";
import { buildDashboardData } from "@/lib/analytics";
import { getAnalyticsCriteria } from "@/lib/analytics-criteria";
import { getAthletes, getGroups, getLogs } from "@/lib/data";
import { toLocalISODate } from "@/lib/dates";
import { getAppProfileForRole } from "@/lib/session";

interface StaffSearch { subject?: string; segment?: string; scope?: string; athlete?: string; group?: string; range?: string; from?: string; to?: string }

export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<StaffSearch> }) {
  const profile = await getAppProfileForRole(["coach", "admin"], "staff");
  const params = await searchParams;
  const criteria = getAnalyticsCriteria();
  const presetRanges = criteria.windowOptionsWeeks.map((weeks) => `${weeks}w`);
  const legacyRange = params.range === "month" || params.range === "week" ? `${criteria.defaultWindowWeeks}w` : params.range;
  const range = [...presetRanges, "all", "custom"].includes(legacyRange ?? "") ? legacyRange! : `${criteria.defaultWindowWeeks}w`;
  const today = new Date();
  const presetWeeks = range.endsWith("w") ? Number(range.slice(0, -1)) : null;
  const from = presetWeeks ? toLocalISODate(subDays(today, presetWeeks * 7 - 1)) : range === "custom" ? params.from : undefined;
  const to = range === "custom" ? params.to : range === "all" ? undefined : toLocalISODate(today);
  const [athletes, groups, allLogs] = await Promise.all([getAthletes(), getGroups(), getLogs(profile, { to })]);
  const legacySubject = params.scope === "individual" && params.athlete ? params.athlete : "team";
  const requestedSubject = params.subject ?? legacySubject;
  const selectedAthlete = athletes.find((athlete) => athlete.id === requestedSubject);
  const subject = selectedAthlete?.id ?? "team";
  const legacySegment = params.scope === "men" || params.scope === "women" ? params.scope : params.scope === "group" && params.group ? `group:${params.group}` : "all";
  const requestedSegment = subject === "team" ? params.segment ?? legacySegment : "all";
  const groupId = requestedSegment.startsWith("group:") ? requestedSegment.slice("group:".length) : null;
  const selectedGroup = groupId ? groups.find((group) => group.id === groupId) : undefined;
  const segment = requestedSegment === "men" || requestedSegment === "women" ? requestedSegment : selectedGroup ? `group:${selectedGroup.id}` : "all";
  const eligibleIds = new Set(subject !== "team" ? [subject] : selectedGroup ? selectedGroup.athleteIds : segment === "men" || segment === "women" ? athletes.filter((athlete) => athlete.teamCategory === segment).map((athlete) => athlete.id) : athletes.map((athlete) => athlete.id));
  const progressionHistory = allLogs.filter((log) => eligibleIds.has(log.athleteId));
  const logs = progressionHistory.filter((log) => (!from || log.activityDate >= from) && (!to || log.activityDate <= to));
  const data = buildDashboardData(logs, { scope: subject === "team" ? "team" : "individual", criteria, progressionHistory });
  const title = selectedAthlete?.displayName ?? (selectedGroup?.name ?? (segment === "men" ? "Men’s team" : segment === "women" ? "Women’s team" : "General team trends"));
  const preservedQuery = new URLSearchParams({ range });
  if (range === "custom" && from && to) { preservedQuery.set("from", from); preservedQuery.set("to", to); }
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Staff performance view</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">{title}</h1><p className="mt-2 text-sm text-[#607181]">Balanced athlete-day analytics across the selected subject and period.</p></div><Link href="/staff/log" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0a304a] px-4 text-sm font-semibold text-white">Log for athlete <ArrowUpRight className="size-4" /></Link></div><DashboardFilters athletes={athletes} groups={groups} windowOptionsWeeks={criteria.windowOptionsWeeks} values={{ subject, segment, range, from, to }} />{logs.length === 0 && <Card className="flex items-center gap-3 border-[#dccba8] bg-[#fffaf0] p-4 text-sm text-[#705a32]"><Users className="size-4" />No logs match these filters. Missing measurements will not be represented as zero.</Card>}<Dashboard data={data} staffDrilldownQuery={preservedQuery.toString()} /></div>;
}
