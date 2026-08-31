"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Gauge, Moon, Waves } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { STROKE_25_OPTIONS, stroke25Label } from "@/lib/swim-tests";
import type { Athlete25yWeek, Daily25yPoint, Daily3x100Point, ProgressionStroke, PublicAnalyticsCriteria, Team25yWeek, TestDay, Weekly25yProgression } from "@/lib/types";
import { cn } from "@/lib/utils";

const days: TestDay[] = ["Monday", "Friday"];
const progressionStrokes = STROKE_25_OPTIONS.map((stroke) => stroke.value);
const strokeOrder: Daily25yPoint["stroke"][] = [...progressionStrokes, "legacy"];
const strokeColors: Record<Daily25yPoint["stroke"], string> = {
  breaststroke: "#d97729", freestyle: "#2d7db6", fly: "#7559b8", backstroke: "#2f9d78", legacy: "#82929d",
};
const mondayColor = "#0a6f7e";
const fridayColor = "#d97729";
const fasterColor = "#2f9d78";
const stableColor = "#94a3ad";
const slowerColor = "#bf4545";

interface SwimTestChartProps {
  daily25y: Daily25yPoint[];
  daily3x100: Daily3x100Point[];
  weekly25y: Weekly25yProgression;
  criteria: PublicAnalyticsCriteria;
  className?: string;
  staffDrilldownQuery?: string;
}

export function SwimTestChart({ daily25y, daily3x100, weekly25y, criteria, className, staffDrilldownQuery }: SwimTestChartProps) {
  return <ChartCard title="25y Monday–Friday progression" eyebrow="Readiness at the start and end of each training week" className={className}>
    <ProgressionView data={weekly25y} criteria={criteria} staffDrilldownQuery={staffDrilldownQuery} />
    <DailyDetails daily25y={daily25y} daily3x100={daily3x100} />
  </ChartCard>;
}

function ProgressionView({ data, criteria, staffDrilldownQuery }: { data: Weekly25yProgression; criteria: PublicAnalyticsCriteria; staffDrilldownQuery?: string }) {
  const available = useMemo(
    () => progressionStrokes.filter((stroke) => data.teamWeeks.some((point) => point.stroke === stroke)),
    [data.teamWeeks],
  );
  const [stroke, setStroke] = useState<ProgressionStroke>(() => available.includes("freestyle") ? "freestyle" : available[0] ?? "freestyle");
  const [showStrokeCount, setShowStrokeCount] = useState(false);
  const [showKickCount, setShowKickCount] = useState(false);

  useEffect(() => {
    if (available.length && !available.includes(stroke)) setStroke(available.includes("freestyle") ? "freestyle" : available[0]);
  }, [available, stroke]);

  const chartData = data.teamWeeks.filter((point) => point.stroke === stroke);
  const individualWeeks = data.scope === "individual" ? data.athleteWeeks.filter((point) => point.stroke === stroke) : [];
  const individualByWeek = new Map(individualWeeks.map((point) => [point.weekStart, point]));
  const timeValues = chartData.flatMap((point) => [point.mondayTimeSeconds, point.fridayTimeSeconds]).filter((value): value is number => value !== null);
  const timeDomain = buildSecondsDomain(timeValues);
  const deltaValues = chartData.flatMap((point) => [point.mondayDeltaSeconds, point.fridayDeltaSeconds]).filter((value): value is number => value !== null);
  const deltaDomain = buildDeltaDomain(deltaValues, criteria);
  const latest = chartData.at(-1);
  const drilldownRows = useMemo(() => data.athleteWeeks
    .filter((item) => item.stroke === stroke && item.monday?.deltaSeconds !== null && item.friday?.deltaSeconds !== null)
    .sort((left, right) => Number(right.possibleRecoveryMismatch) - Number(left.possibleRecoveryMismatch) || (right.friday?.deltaSeconds ?? 0) - (left.friday?.deltaSeconds ?? 0) || right.weekStart.localeCompare(left.weekStart)), [data.athleteWeeks, stroke]);

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold text-[#607181]">Compare the same stroke and weekday with its previous available test.</p><p className="mt-1 text-[.68rem] text-[#82929d]">Stable range: {formatSigned(criteria.stableDeltaLowerSeconds)}s to {formatSigned(criteria.stableDeltaUpperSeconds)}s. Negative change is faster.</p></div>
      <div className="flex flex-wrap gap-2" aria-label="25y progression stroke">{available.map((item) => <button key={item} type="button" aria-pressed={stroke === item} onClick={() => setStroke(item)} className={cn("min-h-9 rounded-lg border px-3 text-xs font-semibold transition", stroke === item ? "border-[#0a6f7e] bg-[#e4f4f5] text-[#075b67]" : "border-[#dce5e9] bg-white text-[#607181]")}>{stroke25Label(item)}</button>)}</div>
    </div>

    {!available.length || !chartData.length ? <EmptyChart message="Assigned-stroke Monday or Friday results will appear here after comparable tests are logged." /> : <>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-[.68rem] font-bold uppercase tracking-[.1em] text-[#82929d]">Count overlays</span><ToggleButton label="Stroke count" active={showStrokeCount} onClick={() => setShowStrokeCount((value) => !value)} color="#7559b8" /><ToggleButton label="Kick count" active={showKickCount} onClick={() => setShowKickCount((value) => !value)} color="#d6a72d" /></div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[#607181]"><Legend color={mondayColor} label="Monday time" /><Legend color={fridayColor} label="Friday time" />{(showStrokeCount || showKickCount) && <span className="font-normal text-[#82929d]">Counts use the right axis.</span>}</div>
        <div className="h-[330px]" aria-label="Monday and Friday 25y progression chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: showStrokeCount || showKickCount ? 8 : 0, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="weekStart" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} /><YAxis yAxisId="time" domain={timeDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "seconds", angle: -90, position: "insideLeft", fill: axisColor, fontSize: 9 }} />{(showStrokeCount || showKickCount) && <YAxis yAxisId="counts" orientation="right" domain={[0, "auto"]} allowDecimals={false} width={38} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />}<Tooltip content={<ProgressionTooltip scope={data.scope} individualByWeek={individualByWeek} />} /><Line yAxisId="time" type="monotone" dataKey="mondayTimeSeconds" name="Monday time" stroke={mondayColor} strokeWidth={3} dot={{ r: 4, fill: mondayColor, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /><Line yAxisId="time" type="monotone" dataKey="fridayTimeSeconds" name="Friday time" stroke={fridayColor} strokeWidth={3} dot={{ r: 4, fill: fridayColor, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />{showStrokeCount && <><Line yAxisId="counts" type="monotone" dataKey="mondayStrokeCount" name="Monday stroke count" stroke="#7559b8" strokeDasharray="6 4" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} /><Line yAxisId="counts" type="monotone" dataKey="fridayStrokeCount" name="Friday stroke count" stroke="#a994dc" strokeDasharray="2 4" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} /></>}{showKickCount && <><Line yAxisId="counts" type="monotone" dataKey="mondayKickCount" name="Monday kick count" stroke="#d6a72d" strokeDasharray="6 4" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} /><Line yAxisId="counts" type="monotone" dataKey="fridayKickCount" name="Friday kick count" stroke="#efc95d" strokeDasharray="2 4" dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} /></>}</ComposedChart></ResponsiveContainer></div>
      </section>

      <section className="border-t border-[#e5ecef] pt-6"><div className="mb-3"><p className="text-xs font-semibold text-[#607181]">Change from the previous comparable weekday test</p><p className="mt-1 text-[.68rem] text-[#82929d]">Green bars improve downward; red bars worsen upward. Gray is inside the configured stable range.</p></div>{!deltaValues.length ? <div className="rounded-xl border border-dashed border-[#d5e0e5] bg-[#f9fbfb] px-5 py-8 text-center text-sm text-[#718491]">A second like-stroke Monday or Friday test is needed before change can be calculated.</div> : <div className="h-[230px]" aria-label="Monday and Friday 25y change chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="weekStart" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} /><YAxis domain={deltaDomain} tickFormatter={(value) => `${formatSigned(value)}s`} width={54} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="#82929d" /><Tooltip content={<DeltaTooltip criteria={criteria} />} /><Bar dataKey="mondayDeltaSeconds" name="Monday change" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false}>{chartData.map((point) => <Cell key={`m:${point.weekStart}`} fill={deltaColor(point.mondayDeltaSeconds, criteria)} />)}</Bar><Bar dataKey="fridayDeltaSeconds" name="Friday change" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false}>{chartData.map((point) => <Cell key={`f:${point.weekStart}`} fill={deltaColor(point.fridayDeltaSeconds, criteria)} />)}</Bar></ComposedChart></ResponsiveContainer></div>}</section>

      {latest && <ContextSummary point={latest} scope={data.scope} />}
      {data.scope === "team" ? <TeamDrilldown rows={drilldownRows} staffDrilldownQuery={staffDrilldownQuery} /> : <IndividualSignal weeks={individualWeeks} />}
    </>}
  </div>;
}

function ContextSummary({ point, scope }: { point: Team25yWeek; scope: Weekly25yProgression["scope"] }) {
  const context = point.context;
  return <section className="rounded-2xl border border-[#dce5e9] bg-[#f8fbfb] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-[#17384d]">Week context · {formatChartDate(point.weekStart)}</p><p className="mt-1 text-xs text-[#718491]">{scope === "team" ? "Median recovery context for athletes represented in this stroke." : "Available measurements surrounding this test week."} Context supports review and does not prove causation.</p></div>{point.flaggedAthleteCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0e4] px-3 py-1.5 text-xs font-bold text-[#9a4d16]"><AlertTriangle className="size-3.5" />{point.flaggedAthleteCount} possible mismatch{point.flaggedAthleteCount === 1 ? "" : "es"}</span>}</div><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><ContextMetric icon={Gauge} label="Practice RPE" value={formatMaybe(context.averagePracticeRpe)} /><ContextMetric icon={Waves} label="Post-session fatigue" value={formatMaybe(context.averagePracticeFatigue)} /><ContextMetric icon={Moon} label="Friday sleep" value={formatMaybe(context.fridaySleepHours, " hrs")} /><ContextMetric icon={AlertTriangle} label="Friday soreness" value={formatMaybe(context.fridaySoreness, " / 10")} /></div></section>;
}

function ContextMetric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) { return <div className="rounded-xl bg-white p-3"><div className="flex items-center gap-2 text-[#718491]"><Icon className="size-3.5" /><span className="text-[.66rem] font-bold uppercase tracking-[.08em]">{label}</span></div><p className="mt-2 text-lg font-bold text-[#17384d]">{value}</p></div>; }

function TeamDrilldown({ rows, staffDrilldownQuery }: { rows: Athlete25yWeek[]; staffDrilldownQuery?: string }) {
  return <section className="border-t border-[#e5ecef] pt-6"><div><p className="text-sm font-bold text-[#17384d]">Athlete drilldown</p><p className="mt-1 text-xs text-[#718491]">Comparable athletes are sorted by possible recovery mismatch, then Friday regression.</p></div>{!rows.length ? <p className="mt-3 rounded-xl bg-[#f8fbfb] px-4 py-5 text-sm text-[#718491]">No athletes have both comparable Monday and Friday results for this stroke in the selected window.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#f7fafb] text-[.62rem] uppercase tracking-[.1em] text-[#718491]"><tr><th className="px-3 py-3">Athlete</th><th className="px-3 py-3">Week</th><th className="px-3 py-3">Monday</th><th className="px-3 py-3">Friday</th><th className="px-3 py-3">M → F</th><th className="px-3 py-3">Signal</th></tr></thead><tbody className="divide-y divide-[#e5ecef]">{rows.map((row) => <tr key={`${row.athleteId}:${row.weekStart}:${row.stroke}`}><td className="px-3 py-3 font-semibold text-[#17384d]"><Link href={`/staff?subject=${row.athleteId}${staffDrilldownQuery ? `&${staffDrilldownQuery}` : ""}`} className="text-[#0a6f7e] hover:underline">{row.athleteName}</Link></td><td className="px-3 py-3 text-[#607181]">{formatChartDate(row.weekStart)}</td><td className="px-3 py-3"><DeltaValue value={row.monday?.deltaSeconds ?? null} /></td><td className="px-3 py-3"><DeltaValue value={row.friday?.deltaSeconds ?? null} /></td><td className="px-3 py-3"><DeltaValue value={row.fridayMinusMondaySeconds} /></td><td className="px-3 py-3">{row.possibleRecoveryMismatch ? <span className="rounded-full bg-[#fff0e4] px-2 py-1 font-bold text-[#9a4d16]">Possible recovery mismatch</span> : <span className="text-[#82929d]">No mismatch</span>}</td></tr>)}</tbody></table></div>}</section>;
}

function IndividualSignal({ weeks }: { weeks: Athlete25yWeek[] }) {
  const flagged = weeks.filter((week) => week.possibleRecoveryMismatch);
  if (!flagged.length) return <div className="rounded-xl bg-[#f4f8f9] px-4 py-3 text-xs text-[#607181]">No possible recovery mismatch meets the configured criteria in this window.</div>;
  return <div className="rounded-xl border border-[#f0cda9] bg-[#fff8ef] px-4 py-3 text-xs text-[#7b4a20]"><p className="font-bold">Possible recovery mismatch</p><p className="mt-1 leading-5">Detected in {flagged.length} week{flagged.length === 1 ? "" : "s"}: {flagged.map((week) => formatChartDate(week.weekStart)).join(", ")}. Review the test and weekly context; this signal is not a diagnosis.</p></div>;
}

function ProgressionTooltip({ active, payload, scope, individualByWeek }: { active?: boolean; payload?: Array<{ payload?: Team25yWeek }>; scope: Weekly25yProgression["scope"]; individualByWeek: Map<string, Athlete25yWeek> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  const athlete = individualByWeek.get(point.weekStart);
  return <div className="min-w-64 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="font-bold text-[#17384d]">Week of {formatChartDate(point.weekStart)} · {stroke25Label(point.stroke)}</p><div className="mt-3 grid grid-cols-2 gap-3"><TooltipDay label="Monday" color={mondayColor} time={point.mondayTimeSeconds} delta={point.mondayDeltaSeconds} count={point.mondayAthleteCount} previousDate={athlete?.monday?.previousDate ?? null} scope={scope} /><TooltipDay label="Friday" color={fridayColor} time={point.fridayTimeSeconds} delta={point.fridayDeltaSeconds} count={point.fridayAthleteCount} previousDate={athlete?.friday?.previousDate ?? null} scope={scope} /></div>{athlete?.fridayMinusMondaySeconds !== null && athlete?.fridayMinusMondaySeconds !== undefined && <p className="mt-3 flex justify-between gap-5 border-t border-[#e5ecef] pt-2 text-[#607181]"><span>Friday − Monday</span><strong className="text-[#17384d]">{formatSigned(athlete.fridayMinusMondaySeconds)}s</strong></p>}{(athlete?.possibleRecoveryMismatch || point.flaggedAthleteCount > 0) && <p className="mt-3 rounded-lg bg-[#fff0e4] px-2.5 py-2 font-bold text-[#9a4d16]">{scope === "team" ? `${point.flaggedAthleteCount} of ${point.comparableAthleteCount} comparable athletes flagged` : "Possible recovery mismatch"}</p>}</div>;
}

function TooltipDay({ label, color, time, delta, count, previousDate, scope }: { label: string; color: string; time: number | null; delta: number | null; count: number; previousDate: string | null; scope: Weekly25yProgression["scope"] }) { return <div><p className="font-bold" style={{ color }}>{label}</p><p className="mt-1 text-lg font-bold text-[#17384d]">{time === null ? "—" : `${Number(time.toFixed(2))}s`}</p><p className="mt-1 text-[#718491]">Change: {delta === null ? "—" : `${formatSigned(delta)}s`}</p>{previousDate && <p className="mt-1 text-[#82929d]">vs {formatChartDate(previousDate)}</p>}{scope === "team" && <p className="mt-1 text-[#82929d]">{count} athlete{count === 1 ? "" : "s"}</p>}</div>; }

function DeltaTooltip({ active, payload, criteria }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: Team25yWeek }>; criteria: PublicAnalyticsCriteria }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  return <div className="min-w-52 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl"><p className="font-bold text-[#17384d]">Week of {formatChartDate(point.weekStart)}</p><div className="mt-2 space-y-1.5">{payload.filter((item) => item.value !== undefined).map((item) => <p key={item.name} className="flex justify-between gap-5"><span className="text-[#607181]">{item.name}</span><strong style={{ color: deltaColor(item.value ?? null, criteria) }}>{formatSigned(item.value ?? 0)}s</strong></p>)}</div><p className="mt-2 border-t border-[#e5ecef] pt-2 text-[.66rem] text-[#82929d]">Stable {formatSigned(criteria.stableDeltaLowerSeconds)}s to {formatSigned(criteria.stableDeltaUpperSeconds)}s</p></div>;
}

function DailyDetails({ daily25y, daily3x100 }: { daily25y: Daily25yPoint[]; daily3x100: Daily3x100Point[] }) {
  const [visibleDays, setVisibleDays] = useState<Record<TestDay, boolean>>({ Monday: true, Friday: true });
  const enabledDays = days.filter((day) => visibleDays[day]);
  return <details className="group mt-8 border-t border-[#dce5e9] pt-5"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 font-semibold text-[#304a5d] hover:bg-[#f7fafb]"><span><span className="block text-sm">Daily results and 3×100 freestyle</span><span className="mt-0.5 block text-[.68rem] font-normal text-[#82929d]">Open the original date-by-date time, stroke, kick, and pace charts.</span></span><ChevronDown className="size-4 transition group-open:rotate-180" /></summary><div className="mt-6 space-y-9"><div className="flex flex-wrap justify-end gap-2" aria-label="Test day filters">{days.map((day) => <button key={day} type="button" aria-pressed={visibleDays[day]} onClick={() => setVisibleDays((current) => ({ ...current, [day]: !current[day] }))} className={cn("min-h-9 rounded-lg border px-3 text-xs font-semibold transition", visibleDays[day] ? "border-[#0a6f7e] bg-[#e4f4f5] text-[#0a6f7e]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}>{day}</button>)}</div>{!enabledDays.length ? <EmptyChart message="Select Monday or Friday." /> : <><Daily25yChart data={daily25y.filter((point) => visibleDays[point.day])} /><Freestyle3x100Chart data={daily3x100.filter((point) => visibleDays[point.day])} /></>}</div></details>;
}

function Daily25yChart({ data }: { data: Daily25yPoint[] }) {
  const available = strokeOrder.filter((stroke) => data.some((point) => point.stroke === stroke));
  const [visibleStrokes, setVisibleStrokes] = useState<Record<string, boolean>>(() => Object.fromEntries(strokeOrder.map((stroke) => [stroke, true])));
  const enabled = available.filter((stroke) => visibleStrokes[stroke]);
  const chartData = data.filter((point) => visibleStrokes[point.stroke]).map((point) => ({ ...point, label: `${formatChartDate(point.date)} · ${stroke25Label(point.stroke, true)}` }));
  const timeDomain = buildSecondsDomain(chartData.map((point) => point.timeSeconds));
  if (!data.length) return <section><p className="text-xs font-semibold text-[#607181]">25y time, stroke count and kick count</p><EmptyChart message="25y daily results will appear here." /></section>;
  return <section><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#607181]">25y time, stroke count and kick count</p><p className="mt-1 text-[.68rem] text-[#82929d]">Grouped by test day and assigned stroke. Counts use the right axis.</p></div><div className="flex flex-wrap justify-end gap-2">{available.map((stroke) => <button key={stroke} type="button" aria-label={`25y stroke filter: ${stroke25Label(stroke)}`} aria-pressed={visibleStrokes[stroke]} onClick={() => setVisibleStrokes((current) => ({ ...current, [stroke]: !current[stroke] }))} className={cn("flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold transition", visibleStrokes[stroke] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visibleStrokes[stroke] && "opacity-30")} style={{ backgroundColor: strokeColors[stroke] }} />{stroke25Label(stroke)}</button>)}</div></div>{!enabled.length ? <EmptyChart message="Select at least one assigned 25y stroke." /> : <div className="h-[320px]" aria-label="25y time stroke and kick count chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={12} /><YAxis yAxisId="time" domain={timeDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="counts" orientation="right" domain={[0, "auto"]} allowDecimals={false} width={38} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<Daily25yTooltip />} /><Bar yAxisId="time" dataKey="timeSeconds" name="25y time" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>{chartData.map((point) => <Cell key={`${point.date}:${point.stroke}`} fill={strokeColors[point.stroke]} />)}</Bar><Line yAxisId="counts" type="monotone" dataKey="strokeCount" name="Stroke count" stroke="#7559b8" strokeWidth={2.5} dot={{ r: 3, fill: "#7559b8", strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /><Line yAxisId="counts" type="monotone" dataKey="kickCount" name="Kick count" stroke="#d6a72d" strokeWidth={2.5} dot={{ r: 3, fill: "#d6a72d", strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>}</section>;
}

function Freestyle3x100Chart({ data }: { data: Daily3x100Point[] }) {
  if (!data.length) return <section className="border-t border-[#e5ecef] pt-7"><p className="text-xs font-semibold text-[#607181]">3×100 freestyle average pace</p><EmptyChart message="Freestyle 3×100 results will appear here." /></section>;
  const domain = buildSecondsDomain(data.map((point) => point.paceSeconds));
  return <section className="border-t border-[#e5ecef] pt-7"><div><p className="text-xs font-semibold text-[#607181]">3×100 freestyle average pace</p><p className="mt-1 text-[.68rem] text-[#82929d]">Average time per 100, grouped by test day.</p></div><div className="mt-3 h-[260px]" aria-label="3x100 freestyle pace chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} /><YAxis domain={domain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<Freestyle3x100Tooltip />} /><Line type="monotone" dataKey="paceSeconds" name="Freestyle pace" stroke="#2d7db6" strokeWidth={2.5} dot={{ r: 3, fill: "#2d7db6", strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></section>;
}

function Daily25yTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: Daily25yPoint & { label: string } }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  return <div className="min-w-52 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl"><p className="font-bold text-[#17384d]">{formatChartDate(point.date)} · {point.day}</p><p className="mb-2 mt-1 text-[#718491]">{stroke25Label(point.stroke)} · {point.athleteCount} athlete{point.athleteCount === 1 ? "" : "s"}</p>{payload.map((item) => <p key={item.name} className="flex justify-between gap-6"><span>{item.name}</span><strong>{item.value === undefined ? "—" : item.name === "25y time" ? `${Number(item.value.toFixed(2))}s` : Number(item.value.toFixed(1))}</strong></p>)}</div>;
}

function Freestyle3x100Tooltip({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; payload?: Daily3x100Point }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  return <div className="min-w-48 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl"><p className="font-bold text-[#17384d]">{formatChartDate(point.date)} · {point.day}</p><p className="mt-1 text-[#718491]">{point.athleteCount} athlete{point.athleteCount === 1 ? "" : "s"}</p><p className="mt-2 flex justify-between gap-6"><span>Freestyle pace</span><strong>{payload[0].value === undefined ? "—" : `${Number(payload[0].value.toFixed(2))}s`}</strong></p></div>;
}

function ToggleButton({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) { return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold", active ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !active && "opacity-30")} style={{ backgroundColor: color }} />{label}</button>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 rounded" style={{ backgroundColor: color }} />{label}</span>; }
function DeltaValue({ value }: { value: number | null }) { return value === null ? <span className="text-[#9aa7af]">—</span> : <span className={value < 0 ? "font-bold text-[#2f7f65]" : value > 0 ? "font-bold text-[#b33d3d]" : "font-semibold text-[#718491]"}>{formatSigned(value)}s</span>; }
function formatMaybe(value: number | null, suffix = "") { return value === null ? "—" : `${Number(value.toFixed(2))}${suffix}`; }
function formatSigned(value: number) { const rounded = Number(value.toFixed(2)); return `${rounded > 0 ? "+" : ""}${rounded}`; }
function deltaColor(value: number | null, criteria: PublicAnalyticsCriteria) { return value === null ? stableColor : value < criteria.stableDeltaLowerSeconds ? fasterColor : value > criteria.stableDeltaUpperSeconds ? slowerColor : stableColor; }

export function buildSecondsDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const minimum = Math.min(...finite);
  const maximum = Math.max(...finite);
  const span = maximum - minimum;
  const padding = Math.max(span * 0.12, maximum < 30 ? 0.1 : 0.5);
  return [Math.max(0, Math.floor((minimum - padding) * 100) / 100), Math.ceil((maximum + padding) * 100) / 100];
}

export function buildDeltaDomain(values: number[], criteria: PublicAnalyticsCriteria): [number, number] {
  const maximum = Math.max(Math.abs(criteria.stableDeltaLowerSeconds), Math.abs(criteria.stableDeltaUpperSeconds), ...values.map(Math.abs));
  const bound = Math.ceil((maximum * 1.2) * 100) / 100;
  return [-bound, bound];
}

export function formatSecondsTick(value: number) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
