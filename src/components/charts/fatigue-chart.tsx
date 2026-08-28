"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { SESSION_LABELS } from "@/lib/constants";
import type { FatiguePoint } from "@/lib/types";

export function FatigueChart({ data }: { data: FatiguePoint[] }) {
  const chartData = data.map((item) => ({ ...item, label: SESSION_LABELS[item.sessionKey] }));
  return <ChartCard title="Post-session fatigue" eyebrow="All scheduled sessions">{!data.length ? <EmptyChart message="Fatigue scores will appear after a training session." /> : <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} /><YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<FatigueTooltip />} /><Bar dataKey="fatigue" name="Fatigue" fill="#7b6aa8" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}</ChartCard>;
}

function FatigueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; payload?: { label?: string } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl"><p className="font-bold text-[#17384d]">{label ? formatChartDate(label) : ""}</p><p className="mt-1 text-[#607181]">{payload[0].payload?.label}</p><p className="mt-2 font-bold text-[#7559b8]">Fatigue {payload[0].value} / 10</p></div>;
}
