import { format, parseISO } from "date-fns";

export function formatChartDate(value: string) {
  try { return format(parseISO(value), "MMM d"); } catch { return value; }
}

export const gridColor = "#e6edef";
export const axisColor = "#718491";

export function ChartTooltip({ active, payload, label, valueSuffix = "" }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string; valueSuffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-[#dce5e9] bg-white p-3 text-xs shadow-xl shadow-[#0a304a]/10">
      <p className="mb-2 font-bold text-[#17384d]">{label ? formatChartDate(label) : ""}</p>
      <div className="space-y-1.5">
        {payload.map((item) => <div key={item.name} className="flex items-center justify-between gap-5"><span className="flex items-center gap-2 text-[#607181]"><span className="size-2 rounded-full" style={{ background: item.color }} />{item.name}</span><strong className="text-[#17384d]">{typeof item.value === "number" ? Number(item.value.toFixed(2)) : "—"}{valueSuffix}</strong></div>)}
      </div>
    </div>
  );
}
