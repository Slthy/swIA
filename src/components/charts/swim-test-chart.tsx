"use client";

import React, { useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { STROKE_25_OPTIONS, stroke25Label } from "@/lib/swim-tests";
import type { Daily25yPoint, Daily3x100Point, TestDay } from "@/lib/types";
import { cn } from "@/lib/utils";

const days: TestDay[] = ["Monday", "Friday"];
const strokeOrder: Daily25yPoint["stroke"][] = [...STROKE_25_OPTIONS.map((stroke) => stroke.value), "legacy"];
const strokeColors: Record<Daily25yPoint["stroke"], string> = {
  breaststroke: "#d97729",
  freestyle: "#2d7db6",
  fly: "#7559b8",
  backstroke: "#2f9d78",
  legacy: "#82929d",
};

export function SwimTestChart({ daily25y, daily3x100, className }: { daily25y: Daily25yPoint[]; daily3x100: Daily3x100Point[]; className?: string }) {
  const [visibleDays, setVisibleDays] = useState<Record<TestDay, boolean>>({ Monday: true, Friday: true });
  const enabledDays = days.filter((day) => visibleDays[day]);
  const dayControls = <div className="flex flex-wrap gap-2" aria-label="Test day filters">{days.map((day) => <button key={day} type="button" aria-pressed={visibleDays[day]} onClick={() => setVisibleDays((current) => ({ ...current, [day]: !current[day] }))} className={cn("min-h-9 rounded-lg border px-3 text-xs font-semibold transition", visibleDays[day] ? "border-[#0a6f7e] bg-[#e4f4f5] text-[#0a6f7e]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}>{day}</button>)}</div>;
  return (
    <ChartCard title="Swim test overview" eyebrow="25y time and counts · freestyle 3×100" controls={dayControls} className={className}>
      {!daily25y.length && !daily3x100.length ? <EmptyChart message="Test results will appear after a Monday or Friday test session." /> : !enabledDays.length ? <EmptyChart message="Select Monday or Friday." /> : (
        <div className="space-y-9">
          <Daily25yChart data={daily25y.filter((point) => visibleDays[point.day])} />
          <Freestyle3x100Chart data={daily3x100.filter((point) => visibleDays[point.day])} />
        </div>
      )}
    </ChartCard>
  );
}

function Daily25yChart({ data }: { data: Daily25yPoint[] }) {
  const available = strokeOrder.filter((stroke) => data.some((point) => point.stroke === stroke));
  const [visibleStrokes, setVisibleStrokes] = useState<Record<string, boolean>>(() => Object.fromEntries(strokeOrder.map((stroke) => [stroke, true])));
  const enabled = available.filter((stroke) => visibleStrokes[stroke]);
  const chartData = data.filter((point) => visibleStrokes[point.stroke]).map((point) => ({
    ...point,
    label: `${formatChartDate(point.date)} · ${stroke25Label(point.stroke, true)}`,
  }));
  const timeDomain = buildSecondsDomain(chartData.map((point) => point.timeSeconds));
  return <section>
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#607181]">25y time, stroke count and kick count</p><p className="mt-1 text-[.68rem] text-[#82929d]">Grouped by test day and assigned stroke. Counts use the right axis.</p></div><div className="flex flex-wrap justify-end gap-2">{available.map((stroke) => <button key={stroke} type="button" aria-label={`25y stroke filter: ${stroke25Label(stroke)}`} aria-pressed={visibleStrokes[stroke]} onClick={() => setVisibleStrokes((current) => ({ ...current, [stroke]: !current[stroke] }))} className={cn("flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold transition", visibleStrokes[stroke] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visibleStrokes[stroke] && "opacity-30")} style={{ backgroundColor: strokeColors[stroke] }} />{stroke25Label(stroke)}</button>)}</div></div>
    {!enabled.length ? <EmptyChart message="Select at least one assigned 25y stroke." /> : <div className="h-[320px]" aria-label="25y time stroke and kick count chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={12} /><YAxis yAxisId="time" domain={timeDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "seconds", angle: -90, position: "insideLeft", fill: axisColor, fontSize: 9 }} /><YAxis yAxisId="counts" orientation="right" domain={[0, "auto"]} allowDecimals={false} width={38} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: "counts", angle: 90, position: "insideRight", fill: axisColor, fontSize: 9 }} /><Tooltip content={<Daily25yTooltip />} /><Bar yAxisId="time" dataKey="timeSeconds" name="25y time" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>{chartData.map((point) => <Cell key={`${point.date}:${point.stroke}`} fill={strokeColors[point.stroke]} />)}</Bar><Line yAxisId="counts" type="monotone" dataKey="strokeCount" name="Stroke count" stroke="#7559b8" strokeWidth={2.5} dot={{ r: 3, fill: "#7559b8", strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /><Line yAxisId="counts" type="monotone" dataKey="kickCount" name="Kick count" stroke="#d6a72d" strokeWidth={2.5} dot={{ r: 3, fill: "#d6a72d", strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>}
  </section>;
}

function Freestyle3x100Chart({ data }: { data: Daily3x100Point[] }) {
  if (!data.length) return <section className="border-t border-[#e5ecef] pt-7"><p className="text-xs font-semibold text-[#607181]">3×100 freestyle average pace</p><EmptyChart message="Freestyle 3×100 results will appear here." /></section>;
  const domain = buildSecondsDomain(data.map((point) => point.paceSeconds));
  return <section className="border-t border-[#e5ecef] pt-7"><div><p className="text-xs font-semibold text-[#607181]">3×100 freestyle average pace</p><p className="mt-1 text-[.68rem] text-[#82929d]">Average time per 100, grouped by test day.</p></div><div className="mt-3 h-[260px]" aria-label="3x100 freestyle pace chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} /><YAxis domain={domain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<Freestyle3x100Tooltip />} /><Line type="monotone" dataKey="paceSeconds" name="Freestyle pace" stroke="#2d7db6" strokeWidth={2.5} dot={{ r: 3, fill: "#2d7db6", strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></section>;
}

function Daily25yTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: Daily25yPoint & { label: string } }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  return <div className="min-w-52 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="font-bold text-[#17384d]">{formatChartDate(point.date)} · {point.day}</p><p className="mb-2 mt-1 text-[#718491]">{stroke25Label(point.stroke)} · {point.athleteCount} athlete{point.athleteCount === 1 ? "" : "s"}</p><div className="space-y-1.5">{payload.map((item) => <div key={item.name} className="flex justify-between gap-6"><span className="text-[#607181]">{item.name}</span><strong className="text-[#17384d]">{item.value === undefined ? "—" : item.name === "25y time" ? `${Number(item.value.toFixed(2))}s` : Number(item.value.toFixed(1))}</strong></div>)}</div></div>;
}

function Freestyle3x100Tooltip({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; payload?: Daily3x100Point }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  return <div className="min-w-48 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="font-bold text-[#17384d]">{formatChartDate(point.date)} · {point.day}</p><p className="mt-1 text-[#718491]">{point.athleteCount} athlete{point.athleteCount === 1 ? "" : "s"}</p><p className="mt-2 flex justify-between gap-6 text-[#607181]"><span>Freestyle pace</span><strong className="text-[#17384d]">{payload[0].value === undefined ? "—" : `${Number(payload[0].value.toFixed(2))}s`}</strong></p></div>;
}

export function buildSecondsDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return [0, 1];
  const minimum = Math.min(...finite);
  const maximum = Math.max(...finite);
  const span = maximum - minimum;
  const padding = Math.max(span * 0.12, maximum < 30 ? 0.1 : 0.5);
  return [Math.max(0, Math.floor((minimum - padding) * 100) / 100), Math.ceil((maximum + padding) * 100) / 100];
}

export function formatSecondsTick(value: number) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
