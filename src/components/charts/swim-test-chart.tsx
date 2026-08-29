"use client";

import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { STROKE_25_OPTIONS, stroke25Label, type Stroke25OrLegacy } from "@/lib/swim-tests";
import type { SwimTestPoint, Weekly25yPoint } from "@/lib/types";
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

export function SwimTestChart({ data, weekly25y, className }: { data: SwimTestPoint[]; weekly25y: Weekly25yPoint[]; className?: string }) {
  const has100 = hasAnyMetric(data, pace3x100Metrics);
  const hasCounts = data.some((item) => item.kickCount !== null || item.strokeCount !== null);
  return (
    <ChartCard title="Swim test progress" eyebrow="Monday–Friday pairing and stroke-specific pace" className={className}>
      {!weekly25y.length && !has100 && !hasCounts ? <EmptyChart message="Test results will appear after paired Monday and Friday swim tests." /> : (
        <div className="space-y-8">
          {weekly25y.length > 0 && <Weekly25yChart data={weekly25y} />}
          {has100 && <StrokeTimeChart data={data} metrics={pace3x100Metrics} label="3×100 average pace by stroke" />}
          {hasCounts && <CountChart data={data} />}
        </div>
      )}
    </ChartCard>
  );
}

const strokeColors: Record<Stroke25OrLegacy, string> = {
  breaststroke: "#d97729",
  freestyle: "#2d7db6",
  fly: "#7559b8",
  backstroke: "#2f9d78",
  legacy: "#82929d",
};

function Weekly25yChart({ data }: { data: Weekly25yPoint[] }) {
  const strokeOrder: Stroke25OrLegacy[] = [...STROKE_25_OPTIONS.map((stroke) => stroke.value), "legacy"];
  const available = strokeOrder.filter((stroke) => data.some((point) => point.stroke === stroke));
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(strokeOrder.map((stroke) => [stroke, true])));
  const enabled = available.filter((stroke) => visible[stroke]);
  const chartData = data.filter((point) => visible[point.stroke]).map((point) => ({
    ...point,
    label: `${formatChartDate(point.weekStart)} · ${stroke25Label(point.stroke, true)}`,
  }));
  const timeDomain = buildSecondsDomain(chartData.flatMap((point) => [point.mondaySeconds, point.fridaySeconds]));
  const maximumDelta = Math.max(0.1, ...chartData.map((point) => Math.abs(point.improvementSeconds)));
  const deltaDomain: [number, number] = [-Math.ceil(maximumDelta * 120) / 100, Math.ceil(maximumDelta * 120) / 100];
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-[#607181]">25y Monday–Friday progression</p><p className="mt-1 text-[.68rem] text-[#82929d]">Positive change means Friday was faster.</p></div><div className="flex flex-wrap gap-2">{available.map((stroke) => <button key={stroke} type="button" aria-label={`25y progression: ${stroke25Label(stroke)}`} aria-pressed={visible[stroke]} onClick={() => setVisible((current) => ({ ...current, [stroke]: !current[stroke] }))} className={cn("flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-[.68rem] font-semibold transition", visible[stroke] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visible[stroke] && "opacity-30")} style={{ backgroundColor: strokeColors[stroke] }} />{stroke25Label(stroke)}</button>)}</div></div>
    {!enabled.length ? <EmptyChart message="Select at least one 25y stroke." /> : <>
      <div><p className="mb-2 text-[.68rem] font-semibold text-[#718491]">Paired times · seconds</p><div className="h-[260px]" aria-label="Monday and Friday 25y paired times chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={14} /><YAxis domain={timeDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<Weekly25yTooltip />} /><Bar dataKey="mondaySeconds" name="Monday" fill="#9fb3bd" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} /><Bar dataKey="fridaySeconds" name="Friday" fill="#0a6f7e" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></div>
      <div><p className="mb-2 text-[.68rem] font-semibold text-[#718491]">Friday improvement · seconds</p><div className="h-[220px]" aria-label="Monday to Friday 25y improvement chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={14} /><YAxis domain={deltaDomain} tickFormatter={formatSecondsTick} width={48} tickCount={5} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="#82929d" /><Tooltip content={<Weekly25yTooltip delta />} /><Bar dataKey="improvementSeconds" name="Improvement" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>{chartData.map((point) => <Cell key={`${point.weekStart}:${point.stroke}`} fill={point.improvementSeconds >= 0 ? "#2f9d78" : "#c95050"} />)}</Bar></BarChart></ResponsiveContainer></div></div>
    </>}
  </section>;
}

function Weekly25yTooltip({ active, payload, delta = false }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: Weekly25yPoint & { label: string } }>; delta?: boolean }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <div className="min-w-48 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="font-bold text-[#17384d]">{point?.label}</p><p className="mb-2 mt-1 text-[#718491]">{point?.pairedAthletes} paired athlete{point?.pairedAthletes === 1 ? "" : "s"}</p><div className="space-y-1.5">{payload.map((item) => <div key={item.name} className="flex justify-between gap-6"><span className="text-[#607181]">{delta ? "Mon − Fri" : item.name}</span><strong className="text-[#17384d]">{item.value === undefined ? "—" : `${Number(item.value.toFixed(2))}s`}</strong></div>)}</div></div>;
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
