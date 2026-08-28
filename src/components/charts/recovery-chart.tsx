"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { CHART_COLORS } from "@/lib/constants";
import type { RecoveryPoint } from "@/lib/types";

export function RecoveryChart({ data }: { data: RecoveryPoint[] }) {
  const hasSleep = data.some((item) => item.sleepHours !== null);
  const hasHr = data.some((item) => item.restingHr !== null);
  return <ChartCard title="Recovery measures" eyebrow="Kept on their own scales">{!hasSleep && !hasHr ? <EmptyChart message="Sleep and resting heart rate will appear when those optional values are logged." /> : <div className="grid gap-6 xl:grid-cols-2">{hasSleep && <Metric data={data} dataKey="sleepHours" label="Sleep duration" suffix="h" color={CHART_COLORS.sleep} />}{hasHr && <Metric data={data} dataKey="restingHr" label="Resting heart rate" suffix=" bpm" color={CHART_COLORS.restingHr} />}</div>}</ChartCard>;
}

function Metric({ data, dataKey, label, suffix, color }: { data: RecoveryPoint[]; dataKey: "sleepHours" | "restingHr"; label: string; suffix: string; color: string }) {
  return <div><p className="mb-3 text-xs font-semibold text-[#607181]">{label}</p><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis domain={["auto", "auto"]} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip valueSuffix={suffix} />} /><Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={2.5} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>;
}
