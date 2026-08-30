"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { bulkSoftDeleteLogsAction, type BulkLogActionState } from "@/app/actions/logs";
import { Card } from "@/components/ui/card";
import { SESSION_LABELS } from "@/lib/constants";
import type { AthleteLog } from "@/lib/types";

const initialState: BulkLogActionState = { error: null, success: null };

export function StaffEntriesTable({ logs, canDelete }: { logs: AthleteLog[]; canDelete: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, setState] = useState<BulkLogActionState>(initialState);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const allSelected = canDelete && logs.length > 0 && selected.size === logs.length;

  useEffect(() => {
    const available = new Set(logs.map((log) => log.id));
    setSelected((current) => new Set([...current].filter((id) => available.has(id))));
  }, [logs]);

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const deleteSelected = () => {
    const ids = [...selected];
    if (!ids.length || pending) return;
    if (!window.confirm(`Delete ${ids.length} selected ${ids.length === 1 ? "entry" : "entries"}? They can be restored from the admin page.`)) return;
    setState(initialState);
    startTransition(async () => {
      try {
        const result = await bulkSoftDeleteLogsAction(ids);
        setState(result);
        if (result.success) {
          setSelected(new Set());
          router.refresh();
        }
      } catch {
        setState({ error: "The selected entries could not be deleted. Try again.", success: null });
      }
    });
  };

  return <Card className="overflow-hidden">
    {canDelete && <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ecef] bg-[#f7fafb] px-4 py-3 sm:px-5">
      <span className="text-xs font-semibold text-[#607181]">{selected.size} selected</span>
      <button type="button" onClick={deleteSelected} disabled={!selected.size || pending} className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#bf4545] px-3 text-xs font-semibold text-white transition hover:bg-[#a83636] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="size-3.5" />{pending ? "Deleting…" : "Delete selected"}</button>
      {state.error && <p role="alert" className="basis-full text-xs font-semibold text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="basis-full text-xs font-semibold text-emerald-700">{state.success}</p>}
    </div>}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-[#f7fafb] text-[.65rem] uppercase tracking-[.1em] text-[#718491]"><tr>
          {canDelete && <th className="w-14 px-5 py-4"><input type="checkbox" aria-label="Select all entries" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(logs.map((log) => log.id)))} className="size-4 accent-[#0a6f7e]" /></th>}
          <th className="px-5 py-4">Activity date</th><th className="px-5 py-4">Athlete</th><th className="px-5 py-4">Session</th><th className="px-5 py-4">RPE</th><th className="px-5 py-4">Fatigue</th><th className="px-5 py-4">Date source</th>
        </tr></thead>
        <tbody className="divide-y divide-[#e5ecef]">{logs.map((log) => <tr key={log.id} className={selected.has(log.id) ? "bg-[#eaf7f8]" : "hover:bg-[#fafcfc]"}>
          {canDelete && <td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${log.athleteName} ${SESSION_LABELS[log.sessionKey]} on ${log.activityDate}`} checked={selected.has(log.id)} onChange={() => toggle(log.id)} className="size-4 accent-[#0a6f7e]" /></td>}
          <td className="px-5 py-4 font-semibold text-[#304a5d]">{format(parseISO(log.activityDate), "MMM d, yyyy")}</td><td className="px-5 py-4">{log.athleteName}</td><td className="px-5 py-4">{SESSION_LABELS[log.sessionKey]}</td><td className="px-5 py-4">{log.rpe ?? "—"}</td><td className="px-5 py-4">{log.fatigue ?? "—"}</td><td className="px-5 py-4 capitalize text-[#718491]">{log.dateSource.replaceAll("_", " ")}</td>
        </tr>)}</tbody>
      </table>
      {!logs.length && <div className="p-12 text-center text-sm text-[#718491]">No team entries yet.</div>}
    </div>
  </Card>;
}
