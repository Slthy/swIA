import { Activity, BedDouble, CalendarDays, Gauge, HeartPulse, Salad, Timer, Trophy } from "lucide-react";
import { HrZoneChart } from "@/components/charts/hr-zone-chart";
import { RecoveryChart } from "@/components/charts/recovery-chart";
import { SessionEffortChart } from "@/components/charts/session-effort-chart";
import { SwimTestChart } from "@/components/charts/swim-test-chart";
import { WellnessChart } from "@/components/charts/wellness-chart";
import { Card } from "@/components/ui/card";
import type { DashboardData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function Dashboard({ data, compact = false }: { data: DashboardData; compact?: boolean }) {
  const cards = [
    ["Days tracked", String(data.summary.daysTracked), "activity dates", CalendarDays, "#0a304a"],
    ["Avg soreness", formatNumber(data.summary.avgSoreness), "/ 10", Activity, "#ef6a67"],
    ["Avg stress", formatNumber(data.summary.avgAcademicStress), "/ 10", Gauge, "#d99a2b"],
    ["Avg nutrition", formatNumber(data.summary.avgNutrition), "/ 10", Salad, "#2f9d78"],
    ["Avg sleep", formatNumber(data.summary.avgSleepHours), "hours", BedDouble, "#7559b8"],
    ["Resting HR", formatNumber(data.summary.avgRestingHr), "bpm", HeartPulse, "#4a8ecf"],
    ["Daily load", formatNumber(data.summary.avgDailyLoad), "RPE avg", Timer, "#d6a72d"],
    ["Test sessions", String(data.swimTests.length), "plotted by stroke", Trophy, "#8d7448"],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="hide-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map(([label, value, unit, Icon, color]) => <Card key={label} className="min-w-[150px] snap-start p-4 sm:min-w-0"><div className="mb-6 flex items-center justify-between"><span className="text-[.67rem] font-bold uppercase tracking-[.11em] text-[#718491]">{label}</span><Icon className="size-4" style={{ color }} /></div><p className="text-2xl font-bold tracking-[-.04em] text-[#17384d]">{value}</p><p className="mt-1 text-xs text-[#82929d]">{unit}</p></Card>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2"><WellnessChart data={data.wellness} /><SessionEffortChart data={data.effort} /></div>
      {!compact && <RecoveryChart data={data.recovery} />}
      <HrZoneChart data={data.zones} />
      {!compact && <SwimTestChart data={data.swimTests} weekly25y={data.weekly25y} weekly3x100={data.weekly3x100} />}
    </div>
  );
}
