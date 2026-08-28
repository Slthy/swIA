"use client";

import React, { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { ChartTooltip, axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { CHART_COLORS } from "@/lib/constants";
import type { WellnessPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const metrics = [
  { key: "soreness", label: "Morning soreness", color: CHART_COLORS.soreness },
  { key: "academicStress", label: "Academic stress", color: CHART_COLORS.academicStress },
  { key: "nutrition", label: "Nutrition", color: CHART_COLORS.nutrition },
] as const;

export function WellnessChart({ data, className }: { data: WellnessPoint[]; className?: string }) {
  const [visible, setVisible] = useState<Record<(typeof metrics)[number]["key"], boolean>>({ soreness: true, academicStress: true, nutrition: true });
  const enabledCount = Object.values(visible).filter(Boolean).length;
  const controls = <div className="flex flex-wrap gap-2">{metrics.map((metric) => <button key={metric.key} type="button" aria-pressed={visible[metric.key]} onClick={() => setVisible((current) => ({ ...current, [metric.key]: !current[metric.key] }))} className={cn("flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition", visible[metric.key] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-full", !visible[metric.key] && "opacity-30")} style={{ background: metric.color }} />{metric.label}</button>)}</div>;
  return (
    <ChartCard title="Wellness scores" eyebrow="Shared 1–10 scale" controls={controls} className={className}>
      {!data.length ? <EmptyChart message="Wellness scores will appear after the first morning check-in." /> : enabledCount === 0 ? <EmptyChart message="Select at least one wellness metric." /> : (
        <div className="h-[290px] w-full" aria-label="Wellness scores line chart">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            {metrics.map((metric) => visible[metric.key] && <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={2.5} dot={{ r: 2.5, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
          </LineChart></ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
