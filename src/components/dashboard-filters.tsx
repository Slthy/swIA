"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import type { AthleteListItem, GroupListItem } from "@/lib/data";

interface DashboardFilterValues {
  subject: string;
  segment: string;
  range: string;
  from?: string;
  to?: string;
}

export function DashboardFilters({ athletes, groups, values, windowOptionsWeeks }: { athletes: AthleteListItem[]; groups: GroupListItem[]; values: DashboardFilterValues; windowOptionsWeeks: number[] }) {
  const [subject, setSubject] = useState(values.subject);
  const [segment, setSegment] = useState(values.segment);
  const [range, setRange] = useState(values.range);
  const [from, setFrom] = useState(values.from ?? "");
  const [to, setTo] = useState(values.to ?? "");
  const controlClass = "min-h-11 w-full rounded-xl border border-[#d4dfe4] bg-white px-3 text-sm font-semibold text-[#304a5d] outline-none focus:border-[#16a5b8] sm:w-auto";
  const fieldClass = "w-full sm:w-auto";
  return <form method="get" className="surface-card grid grid-cols-1 items-end gap-3 p-4 sm:flex sm:flex-wrap">
    <div className="mr-1 hidden size-10 place-items-center rounded-xl bg-[#e7f3f4] text-[#0a6f7e] sm:grid"><Filter className="size-4" /></div>
    <label className={fieldClass}><span className="mb-1.5 block text-[.65rem] font-bold uppercase tracking-[.1em] text-[#82929d]">Trend subject</span><select name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} className={`${controlClass} sm:max-w-60`}><option value="team">General team trends</option><optgroup label="Individual athletes">{athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.displayName}</option>)}</optgroup></select></label>
    {subject === "team" && <label className={fieldClass}><span className="mb-1.5 block text-[.65rem] font-bold uppercase tracking-[.1em] text-[#82929d]">Team segment</span><select name="segment" value={segment} onChange={(event) => setSegment(event.target.value)} className={controlClass}><option value="all">Entire team</option><option value="men">Men</option><option value="women">Women</option>{groups.length > 0 && <optgroup label="Training groups">{groups.map((group) => <option key={group.id} value={`group:${group.id}`}>{group.name}</option>)}</optgroup>}</select></label>}
    <label className={fieldClass}><span className="mb-1.5 block text-[.65rem] font-bold uppercase tracking-[.1em] text-[#82929d]">Timeframe</span><select name="range" value={range} onChange={(event) => setRange(event.target.value)} className={controlClass}>{windowOptionsWeeks.map((weeks) => <option key={weeks} value={`${weeks}w`}>Last {weeks} weeks</option>)}<option value="all">All time</option><option value="custom">Custom dates</option></select></label>
    {range === "custom" && <><label className={fieldClass}><span className="mb-1.5 block text-[.65rem] font-bold uppercase tracking-[.1em] text-[#82929d]">From</span><input type="date" name="from" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className={controlClass} required /></label><label className={fieldClass}><span className="mb-1.5 block text-[.65rem] font-bold uppercase tracking-[.1em] text-[#82929d]">To</span><input type="date" name="to" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={controlClass} required /></label></>}
    <button className="min-h-11 w-full rounded-xl bg-[#0a304a] px-5 text-sm font-semibold text-white sm:w-auto">Apply filters</button>
  </form>;
}
