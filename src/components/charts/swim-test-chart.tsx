"use client";

import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { STROKE_25_OPTIONS, stroke25Label, type Stroke25OrLegacy } from "@/lib/swim-tests";
import type { SwimStroke, SwimTestPoint, Weekly3x100Point, Weekly25yPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

type TimeMetricKey = keyof Pick<SwimTestPoint,
  | "time25ySeconds"
  | "pace3x100Seconds"
  | "time25yBreaststrokeSeconds"
  | "time25yFreestyleSeconds"
  | "time25yFlySeconds"
  | "time25yBackstrokeSeconds"
  | "pace3x100BreaststrokeSeconds"
  | "pace3x100FreestyleSeconds"
  | "pace3x100FlySeconds"
  | "pace3x100BackstrokeSeconds"
  | "pace3x100ImSeconds"
>;

interface TimeMetric {
  key: TimeMetricKey;
  label: string;
  color: string;
  legacy?: boolean;
}

const pace3x100Metrics: TimeMetric[] = [
  { key: "pace3x100BreaststrokeSeconds", label: "Breaststroke", color: "#d97729" },
  { key: "pace3x100FreestyleSeconds", label: "Freestyle", color: "#2d7db6" },
  { key: "pace3x100FlySeconds", label: "Fly", color: "#7559b8" },
  { key: "pace3x100BackstrokeSeconds", label: "Backstroke", color: "#2f9d78" },
  { key: "pace3x100ImSeconds", label: "IM", color: "#b83b3b" },
  { key: "pace3x100Seconds", label: "Unspecified (legacy)", color: "#82929d", legacy: true },
];

export function SwimTestChart({ data, weekly25y, weekly3x100, className }: { data: SwimTestPoint[]; weekly25y: Weekly25yPoint[]; weekly3x100: Weekly3x100Point[]; className?: string }) {
  const has100 = hasAnyMetric(data, pace3x100Metrics);
  const hasCounts = data.some((item) => item.kickCount !== null || item.strokeCount !== null);
  return (
    <ChartCard title="Swim test progress" eyebrow="Monday–Friday pairing and stroke-specific pace" className={className}>
      {!weekly25y.length && !has100 && !weekly3x100.length && !hasCounts ? <EmptyChart message="Test results will appear after paired Monday and Friday swim tests." /> : (
        <div className="space-y-8">
          {weekly25y.length > 0 && <Weekly25yChart data={weekly25y} />}
          {(has100 || weekly3x100.length > 0) && <Weekly3x100Chart data={data} weekly={weekly3x100} />}
          {hasCounts && <CountChart data={data} />}
        </div>
      )}
    </ChartCard>
  );
}

const strokeColors: Record<SwimStroke | "legacy", string> = {
  breaststroke: "#d97729",
  freestyle: "#2d7db6",
  fly: "#7559b8",
  backstroke: "#2f9d78",
  im: "#b83b3b",
  legacy: "#82929d",
};

export type Weekly25yDisplayMode = "best-improvement" | "fastest-time";

interface Weekly25yLeader {
  athleteId: string;
  athleteName: string;
  session: "Monday" | "Friday";
  seconds: number;
}

type WeeklyPairPoint = Weekly25yPoint | Weekly3x100Point;

type WeeklyPairDisplayPoint<T extends WeeklyPairPoint> = T & {
  selectionMode: Weekly25yDisplayMode;
  fastestMonday: Weekly25yLeader | null;
  fastestFriday: Weekly25yLeader | null;
};

function selectWeeklyPairPoints<T extends WeeklyPairPoint>(data: T[], mode: Weekly25yDisplayMode): Array<WeeklyPairDisplayPoint<T>> {
  const grouped = new Map<string, T[]>();
  for (const point of data) {
    const key = `${point.weekStart}:${point.stroke}`;
    grouped.set(key, [...(grouped.get(key) ?? []), point]);
  }
  return [...grouped.values()].map((points) => {
    const fastestMondayPoint = minimumBy(points, (point) => point.mondaySeconds);
    const fastestFridayPoint = minimumBy(points, (point) => point.fridaySeconds);
    const fastestMonday: Weekly25yLeader = { athleteId: fastestMondayPoint.athleteId, athleteName: fastestMondayPoint.athleteName, session: "Monday", seconds: fastestMondayPoint.mondaySeconds };
    const fastestFriday: Weekly25yLeader = { athleteId: fastestFridayPoint.athleteId, athleteName: fastestFridayPoint.athleteName, session: "Friday", seconds: fastestFridayPoint.fridaySeconds };
    const selected = mode === "best-improvement"
      ? minimumBy(points, (point) => point.deltaSeconds, (point) => Math.min(point.mondaySeconds, point.fridaySeconds))
      : fastestMonday.seconds <= fastestFriday.seconds ? fastestMondayPoint : fastestFridayPoint;
    return {
      ...selected,
      selectionMode: mode,
      fastestMonday: mode === "fastest-time" ? fastestMonday : null,
      fastestFriday: mode === "fastest-time" ? fastestFriday : null,
    };
  }).sort((left, right) => left.weekStart.localeCompare(right.weekStart) || left.stroke.localeCompare(right.stroke));
}

export function selectWeekly25yPoints(data: Weekly25yPoint[], mode: Weekly25yDisplayMode) {
  return selectWeeklyPairPoints(data, mode);
}

export function selectWeekly3x100Points(data: Weekly3x100Point[], mode: Weekly25yDisplayMode) {
  return selectWeeklyPairPoints(data, mode);
}

function minimumBy<T>(items: T[], primary: (item: T) => number, secondary: (item: T) => number = primary): T {
  return [...items].sort((left, right) => primary(left) - primary(right) || secondary(left) - secondary(right))[0];
}

function Weekly25yChart({ data }: { data: Weekly25yPoint[] }) {
  const strokeOrder: Stroke25OrLegacy[] = [...STROKE_25_OPTIONS.map((stroke) => stroke.value), "legacy"];
  const available = strokeOrder.filter((stroke) => data.some((point) => point.stroke === stroke));
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(strokeOrder.map((stroke) => [stroke, true])));
  const [mode, setMode] = useState<Weekly25yDisplayMode>("best-improvement");
  const enabled = available.filter((stroke) => visible[stroke]);
  const chartData = selectWeekly25yPoints(data, mode).filter((point) => visible[point.stroke]).map((point) => ({
    ...point,
    label: `${formatChartDate(point.weekStart)} · ${stroke25Label(point.stroke, true)}`,
  }));
  const timeDomain = buildSecondsDomain(chartData.flatMap((point) => [point.mondaySeconds, point.fridaySeconds]));
  const maximumDelta = Math.max(0.1, ...chartData.map((point) => Math.abs(point.deltaSeconds)));
  const deltaDomain: [number, number] = [-Math.ceil(maximumDelta * 120) / 100, Math.ceil(maximumDelta * 120) / 100];
  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#607181]">25y Monday–Friday progression</p><p className="mt-1 text-[.68rem] text-[#82929d]">Delta is Friday − Monday: negative is faster, positive is slower.</p></div><div className="flex flex-wrap gap-2" aria-label="25y selection mode">{([{"value":"best-improvement","label":"Best improvement"},{"value":"fastest-time","label":"Fastest time"}] as const).map((option) => <button key={option.value} type="button" aria-pressed={mode === option.value} onClick={() => setMode(option.value)} className={cn("min-h-8 rounded-lg border px-3 text-[.68rem] font-semibold transition", mode === option.value ? "border-[#0a6f7e] bg-[#e4f4f5] text-[#0a6f7e]" : "border-[#d5e0e5] bg-white text-[#607181]")}>{option.label}</button>)}</div></div>
    <div className="flex flex-wrap justify-end gap-2">{available.map((stroke) => <button key={stroke} type="button" aria-label={`25y progression: ${stroke25Label(stroke)}`} aria-pressed={visible[stroke]} onClick={() => setVisible((current) => ({ ...current, [stroke]: !current[stroke] }))} className={cn("flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold transition", visible[stroke] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visible[stroke] && "opacity-30")} style={{ backgroundColor: strokeColors[stroke] }} />{stroke25Label(stroke)}</button>)}</div>
    {!enabled.length ? <EmptyChart message="Select at least one 25y stroke." /> : <>
      <div><p className="mb-2 text-[.68rem] font-semibold text-[#718491]">Selected athlete’s paired times · seconds</p><div className="h-[260px]" aria-label="Monday and Friday 25y paired times chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={14} /><YAxis domain={timeDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<Weekly25yTooltip />} /><Bar dataKey="mondaySeconds" name="Monday" fill="#9fb3bd" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} /><Bar dataKey="fridaySeconds" name="Friday" fill="#0a6f7e" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></div>
      <div><p className="mb-2 text-[.68rem] font-semibold text-[#718491]">Delta (Friday − Monday) · seconds</p><div className="h-[220px]" aria-label="Monday to Friday 25y delta chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={14} /><YAxis domain={deltaDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="#82929d" /><Tooltip content={<Weekly25yTooltip delta />} /><Bar dataKey="deltaSeconds" name="Delta" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>{chartData.map((point) => <Cell key={`${point.weekStart}:${point.stroke}`} fill={point.deltaSeconds < 0 ? "#2f9d78" : point.deltaSeconds > 0 ? "#c95050" : "#82929d"} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </>}
  </section>;
}

type Weekly3x100Mode = "team-average" | Weekly25yDisplayMode;

function Weekly3x100Chart({ data, weekly }: { data: SwimTestPoint[]; weekly: Weekly3x100Point[] }) {
  const [mode, setMode] = useState<Weekly3x100Mode>("team-average");
  const options = [
    { value: "team-average", label: "Team average" },
    { value: "best-improvement", label: "Best improvement" },
    { value: "fastest-time", label: "Fastest time" },
  ] as const;
  return <section className="space-y-5 border-t border-[#e5ecef] pt-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#607181]">3×100 average pace by stroke</p><p className="mt-1 text-[.68rem] text-[#82929d]">Keep the team trend or compare paired athlete progression.</p></div><div className="flex flex-wrap gap-2" aria-label="3x100 selection mode">{options.map((option) => <button key={option.value} type="button" disabled={option.value !== "team-average" && !weekly.length} aria-pressed={mode === option.value} onClick={() => setMode(option.value)} className={cn("min-h-8 rounded-lg border px-3 text-[.68rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40", mode === option.value ? "border-[#0a6f7e] bg-[#e4f4f5] text-[#0a6f7e]" : "border-[#d5e0e5] bg-white text-[#607181]")}>{option.label}</button>)}</div></div>
    {mode === "team-average"
      ? <StrokeTimeChart data={data} metrics={pace3x100Metrics} label="Team average 3×100 pace" />
      : <Weekly3x100PairChart data={weekly} mode={mode} />}
  </section>;
}

function Weekly3x100PairChart({ data, mode }: { data: Weekly3x100Point[]; mode: Weekly25yDisplayMode }) {
  const strokeOrder: Weekly3x100Point["stroke"][] = ["breaststroke", "freestyle", "fly", "backstroke", "im", "legacy"];
  const available = strokeOrder.filter((stroke) => data.some((point) => point.stroke === stroke));
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(strokeOrder.map((stroke) => [stroke, true])));
  const enabled = available.filter((stroke) => visible[stroke]);
  const chartData = selectWeekly3x100Points(data, mode).filter((point) => visible[point.stroke]).map((point) => ({
    ...point,
    label: `${formatChartDate(point.weekStart)} · ${swimStrokeLabel(point.stroke, true)}`,
  }));
  const timeDomain = buildSecondsDomain(chartData.flatMap((point) => [point.mondaySeconds, point.fridaySeconds]));
  const maximumDelta = Math.max(0.1, ...chartData.map((point) => Math.abs(point.deltaSeconds)));
  const deltaDomain: [number, number] = [-Math.ceil(maximumDelta * 120) / 100, Math.ceil(maximumDelta * 120) / 100];
  return <div className="space-y-5">
    <p className="text-[.68rem] text-[#82929d]">Delta is Friday − Monday: negative is faster, positive is slower.</p>
    <div className="flex flex-wrap justify-end gap-2">{available.map((stroke) => <button key={stroke} type="button" aria-label={`3×100 progression: ${swimStrokeLabel(stroke)}`} aria-pressed={visible[stroke]} onClick={() => setVisible((current) => ({ ...current, [stroke]: !current[stroke] }))} className={cn("flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold transition", visible[stroke] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visible[stroke] && "opacity-30")} style={{ backgroundColor: strokeColors[stroke] }} />{swimStrokeLabel(stroke)}</button>)}</div>
    {!enabled.length ? <EmptyChart message="Select at least one 3×100 stroke." /> : <>
      <div><p className="mb-2 text-[.68rem] font-semibold text-[#718491]">Selected athlete’s paired average paces · seconds</p><div className="h-[260px]" aria-label="Monday and Friday 3x100 paired pace chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={14} /><YAxis domain={timeDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<Weekly25yTooltip />} /><Bar dataKey="mondaySeconds" name="Monday" fill="#9fb3bd" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} /><Bar dataKey="fridaySeconds" name="Friday" fill="#0a6f7e" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></div>
      <div><p className="mb-2 text-[.68rem] font-semibold text-[#718491]">Delta (Friday − Monday) · seconds</p><div className="h-[220px]" aria-label="Monday to Friday 3x100 delta chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={14} /><YAxis domain={deltaDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="#82929d" /><Tooltip content={<Weekly25yTooltip delta />} /><Bar dataKey="deltaSeconds" name="Delta" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>{chartData.map((point) => <Cell key={`${point.weekStart}:${point.stroke}`} fill={point.deltaSeconds < 0 ? "#2f9d78" : point.deltaSeconds > 0 ? "#c95050" : "#82929d"} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </>}
  </div>;
}

function swimStrokeLabel(stroke: Weekly3x100Point["stroke"], short = false) {
  if (stroke === "im") return "IM";
  return stroke25Label(stroke, short);
}

function Weekly25yTooltip({ active, payload, delta = false }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: WeeklyPairDisplayPoint<WeeklyPairPoint> & { label: string } }>; delta?: boolean }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point) return null;
  const differentFastestAthletes = point.fastestMonday && point.fastestFriday && point.fastestMonday.athleteId !== point.fastestFriday.athleteId;
  return <div className="min-w-56 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="font-bold text-[#17384d]">{point.label}</p><p className="mb-2 mt-1 text-[#718491]">{point.athleteName} · {point.selectionMode === "best-improvement" ? "best weekly improvement" : "fastest single time"}</p><div className="space-y-1.5">{payload.map((item) => <div key={item.name} className="flex justify-between gap-6"><span className="text-[#607181]">{delta ? "Fri − Mon" : item.name}</span><strong className={cn(point.deltaSeconds < 0 && delta ? "text-[#2f7d62]" : point.deltaSeconds > 0 && delta ? "text-[#b83b3b]" : "text-[#17384d]")}>{item.value === undefined ? "—" : delta ? formatDelta(item.value) : `${Number(item.value.toFixed(2))}s`}</strong></div>)}</div>{differentFastestAthletes && <div className="mt-2 space-y-1 border-t border-[#e5ecef] pt-2 text-[#607181]"><p>Monday leader: <strong className="text-[#17384d]">{point.fastestMonday?.athleteName} · {point.fastestMonday?.seconds}s</strong></p><p>Friday leader: <strong className="text-[#17384d]">{point.fastestFriday?.athleteName} · {point.fastestFriday?.seconds}s</strong></p></div>}</div>;
}

function formatDelta(value: number) {
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded}s`;
}

function StrokeTimeChart({ data, metrics, label }: { data: SwimTestPoint[]; metrics: TimeMetric[]; label: string }) {
  const available = metrics.filter((metric) => data.some((item) => item[metric.key] !== null));
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(metrics.map((metric) => [metric.key, true])));
  const enabled = available.filter((metric) => visible[metric.key]);
  const values = data.flatMap((item) => enabled.map((metric) => item[metric.key]).filter((value): value is number => value !== null));
  const domain = buildSecondsDomain(values);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#607181]">{label} · seconds</p>
        <div className="flex flex-wrap gap-2">
          {available.map((metric) => (
            <button
              key={metric.key}
              type="button"
              aria-label={`${label}: ${metric.label}`}
              aria-pressed={visible[metric.key]}
              onClick={() => setVisible((current) => ({ ...current, [metric.key]: !current[metric.key] }))}
              className={cn(
                "flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold transition",
                visible[metric.key] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]",
              )}
            >
              <span className={cn("size-2 rounded-full", !visible[metric.key] && "opacity-30")} style={{ backgroundColor: metric.color }} />
              {metric.label}
            </button>
          ))}
        </div>
      </div>
      {!enabled.length ? <EmptyChart message={`Select at least one ${label.toLowerCase()} series.`} /> : (
        <div className="h-[260px]" aria-label={`${label} line chart`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis domain={domain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip valueSuffix="s" />} />
              {enabled.map((metric) => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  name={metric.label}
                  stroke={metric.color}
                  strokeDasharray={metric.legacy ? "5 4" : undefined}
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: metric.color, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function CountChart({ data }: { data: SwimTestPoint[] }) {
  return <section><p className="mb-3 text-xs font-semibold text-[#607181]">Kick and stroke counts</p><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis domain={["auto", "auto"]} width={42} tickFormatter={(value) => String(Math.round(Number(value)))} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="kickCount" name="Kicks" stroke="#d97729" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /><Line type="monotone" dataKey="strokeCount" name="Strokes" stroke="#2d7db6" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></section>;
}

function hasAnyMetric(data: SwimTestPoint[], metrics: TimeMetric[]) {
  return metrics.some((metric) => data.some((item) => item[metric.key] !== null));
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
