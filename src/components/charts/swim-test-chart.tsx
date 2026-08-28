"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import type { SwimTestPoint } from "@/lib/types";

export function SwimTestChart({ data, className }: { data: SwimTestPoint[]; className?: string }) {
  const has25 = data.some((item) => item.time25ySeconds !== null);
  const has100 = data.some((item) => item.pace3x100Seconds !== null);
  const hasCounts = data.some((item) => item.kickCount !== null || item.strokeCount !== null);
  return <ChartCard title="Swim test progress" eyebrow="Separate time and count scales" className={className}>{!has25 && !has100 && !hasCounts ? <EmptyChart message="Test results will appear after a Monday or Friday swim test." /> : <div className="grid gap-6 xl:grid-cols-2">{has25 && <TimeChart data={data} dataKey="time25ySeconds" label="25y max effort" color="#7559b8" />}{has100 && <TimeChart data={data} dataKey="pace3x100Seconds" label="3×100 average pace" color="#169779" />}{hasCounts && <CountChart data={data} />}</div>}</ChartCard>;
}

function TimeChart({ data, dataKey, label, color }: { data: SwimTestPoint[]; dataKey: "time25ySeconds" | "pace3x100Seconds"; label: string; color: string }) {
  return <div><p className="mb-3 text-xs font-semibold text-[#607181]">{label} · seconds</p><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis domain={["auto", "auto"]} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip valueSuffix="s" />} /><Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>;
}

function CountChart({ data }: { data: SwimTestPoint[] }) {
  return <div><p className="mb-3 text-xs font-semibold text-[#607181]">Kick and stroke counts</p><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis domain={["auto", "auto"]} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="kickCount" name="Kicks" stroke="#d97729" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /><Line type="monotone" dataKey="strokeCount" name="Strokes" stroke="#2d7db6" strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>;
}
