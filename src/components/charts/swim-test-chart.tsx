"use client";

import React, { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import type { SwimTestPoint } from "@/lib/types";
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

const time25Metrics: TimeMetric[] = [
  { key: "time25yBreaststrokeSeconds", label: "Breaststroke", color: "#d97729" },
  { key: "time25yFreestyleSeconds", label: "Freestyle", color: "#2d7db6" },
  { key: "time25yFlySeconds", label: "Fly", color: "#7559b8" },
  { key: "time25yBackstrokeSeconds", label: "Backstroke", color: "#2f9d78" },
  { key: "time25ySeconds", label: "Unspecified (legacy)", color: "#82929d", legacy: true },
];

const pace3x100Metrics: TimeMetric[] = [
  { key: "pace3x100BreaststrokeSeconds", label: "Breaststroke", color: "#d97729" },
  { key: "pace3x100FreestyleSeconds", label: "Freestyle", color: "#2d7db6" },
  { key: "pace3x100FlySeconds", label: "Fly", color: "#7559b8" },
  { key: "pace3x100BackstrokeSeconds", label: "Backstroke", color: "#2f9d78" },
  { key: "pace3x100ImSeconds", label: "IM", color: "#b83b3b" },
  { key: "pace3x100Seconds", label: "Unspecified (legacy)", color: "#82929d", legacy: true },
];

export function SwimTestChart({ data, className }: { data: SwimTestPoint[]; className?: string }) {
  const has25 = hasAnyMetric(data, time25Metrics);
  const has100 = hasAnyMetric(data, pace3x100Metrics);
  const hasCounts = data.some((item) => item.kickCount !== null || item.strokeCount !== null);
  return (
    <ChartCard title="Swim test progress" eyebrow="Stroke-specific times with formatted second scales" className={className}>
      {!has25 && !has100 && !hasCounts ? <EmptyChart message="Test results will appear after a Monday or Friday swim test." /> : (
        <div className="space-y-8">
          {has25 && <StrokeTimeChart data={data} metrics={time25Metrics} label="25y time by stroke" />}
          {has100 && <StrokeTimeChart data={data} metrics={pace3x100Metrics} label="3×100 average pace by stroke" />}
          {hasCounts && <CountChart data={data} />}
        </div>
      )}
    </ChartCard>
  );
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
