"use client";

import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { axisColor, formatChartDate, gridColor } from "@/components/charts/chart-utils";
import { CHART_COLORS } from "@/lib/constants";
import type { ZonePoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const zones = [1, 2, 3, 4, 5].map((number) => ({ key: `zone${number}` as keyof Omit<ZonePoint, "date">, label: `Zone ${number}`, color: CHART_COLORS[`zone${number}` as keyof typeof CHART_COLORS] }));

export function HrZoneChart({ data, className }: { data: ZonePoint[]; className?: string }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({ zone1: true, zone2: true, zone3: true, zone4: true, zone5: true });
  const enabled = zones.filter((zone) => visible[zone.key]);
  const controls = <div className="flex flex-wrap gap-2">{zones.map((zone) => <button key={zone.key} type="button" aria-pressed={visible[zone.key]} onClick={() => setVisible((current) => ({ ...current, [zone.key]: !current[zone.key] }))} className={cn("flex min-h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition", visible[zone.key] ? "border-[#cdd9df] bg-white text-[#304a5d]" : "border-transparent bg-[#edf2f4] text-[#82929d]")}><span className={cn("size-2 rounded-sm", !visible[zone.key] && "opacity-30")} style={{ background: zone.color }} />{zone.label}</button>)}</div>;
  return (
    <ChartCard title="HR zone distribution" eyebrow="Stacked minutes per day" controls={controls} className={className}>
      {!data.length ? <EmptyChart message="HR-zone minutes will appear after a practice or lift log." /> : enabled.length === 0 ? <EmptyChart message="Select at least one HR zone." /> : (
        <div className="h-[300px] w-full" aria-label="Stacked heart-rate zone minutes chart">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
            <Tooltip content={<ZoneTooltip visibleKeys={enabled.map((zone) => zone.key)} />} />
            {enabled.map((zone, index) => <Bar key={zone.key} dataKey={zone.key} name={zone.label} stackId="zones" fill={zone.color} radius={index === enabled.length - 1 ? [5, 5, 0, 0] : 0} isAnimationActive={false} />)}
          </BarChart></ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function ZoneTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>; label?: string; visibleKeys: string[] }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);
  return <div className="min-w-40 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10"><p className="mb-2 font-bold text-[#17384d]">{label ? formatChartDate(label) : ""}</p><div className="space-y-1.5">{payload.map((item) => <div key={item.dataKey} className="flex justify-between gap-6"><span className="flex items-center gap-2 text-[#607181]"><span className="size-2 rounded-sm" style={{ background: item.color }} />{item.name}</span><strong>{item.value ?? 0}m</strong></div>)}</div><div className="mt-2 flex justify-between border-t border-[#e7edef] pt-2 font-bold text-[#17384d]"><span>Visible total</span><span>{Number(total.toFixed(1))}m</span></div></div>;
}
