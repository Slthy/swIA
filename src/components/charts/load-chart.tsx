"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { CHART_COLORS } from "@/lib/constants";
import type { LoadPoint } from "@/lib/types";

export function LoadChart({ data, className }: { data: LoadPoint[]; className?: string }) {
  return <ChartCard title="Training load" eyebrow="Average session RPE" className={className}>{!data.length ? <EmptyChart message="Training load will appear after the first session log." /> : <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="dailyLoad" name="Daily load" stroke={CHART_COLORS.load} strokeWidth={3} dot={{ r: 3, fill: CHART_COLORS.load, strokeWidth: 0 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>}</ChartCard>;
}
