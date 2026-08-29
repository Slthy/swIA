"use client";

import React, { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { SESSION_LABELS } from "@/lib/constants";
import type { SessionEffortPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const metrics = [
  { key: "rpe", label: "Session RPE", color: "#d6a72d" },
  { key: "fatigue", label: "Post-session fatigue", color: "#7559b8" },
] as const;

export function SessionEffortChart({ data, className }: { data: SessionEffortPoint[]; className?: string }) {
  const [visible, setVisible] = useState<Record<(typeof metrics)[number]["key"], boolean>>({ rpe: true, fatigue: true });
  const enabled = metrics.filter((metric) => visible[metric.key]);
  const chartData = data.map((point, index) => ({ ...point, id: `${point.date}:${point.sessionKey}:${index}` }));
  const controls = <div className="flex flex-wrap gap-2">{metrics.map((metric) => <button key={metric.key} type="button" aria-pressed={visible[metric.key]} onClick={() => setVisible((current) => ({ ...current, [metric.key]: !current[metric.key] }))} className={cn("flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition", visible[metric.key] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visible[metric.key] && "opacity-30")} style={{ backgroundColor: metric.color }} />{metric.label}</button>)}</div>;
  return (
    <ChartCard title="Session effort and fatigue" eyebrow="Shared 1–10 scale" controls={controls} className={className}>
      {!data.length ? <EmptyChart message="RPE and fatigue will appear after the first training-session log." /> : !enabled.length ? <EmptyChart message="Select RPE or post-session fatigue." /> : (
        <div className="h-[290px]" aria-label="Session RPE and post-session fatigue line chart">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke={gridColor} vertical={false} /><XAxis dataKey="id" tickFormatter={(value) => formatChartDate(String(value).split(":")[0])} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<EffortTooltip />} />{enabled.map((metric) => <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={2.5} dot={{ r: 2.5, fill: metric.color, strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function EffortTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; payload?: SessionEffortPoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <div className="min-w-48 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="font-bold text-[#17384d]">{point ? formatChartDate(point.date) : ""}</p><p className="mb-2 mt-1 text-[#718491]">{point ? SESSION_LABELS[point.sessionKey] : ""}</p><div className="space-y-1.5">{payload.map((item) => <div key={item.name} className="flex justify-between gap-5"><span className="flex items-center gap-2 text-[#607181]"><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong className="text-[#17384d]">{item.value === undefined ? "—" : Number(item.value.toFixed(1))}</strong></div>)}</div></div>;
}
