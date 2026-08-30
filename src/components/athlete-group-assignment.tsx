"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import { setAthleteGroupsAction, type AccountMutationState } from "@/app/admin/actions";
import type { GroupListItem } from "@/lib/data";

const initialState: AccountMutationState = { error: null, success: null };

interface AthleteGroupAssignmentProps {
  athleteId: string;
  athleteName: string;
  groups: GroupListItem[];
  selectedGroupIds: string[];
}

export function AthleteGroupAssignment({ athleteId, athleteName, groups, selectedGroupIds }: AthleteGroupAssignmentProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedGroupIds));
  const [saved, setSaved] = useState<Set<string>>(() => new Set(selectedGroupIds));
  const [state, setState] = useState<AccountMutationState>(initialState);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const changed = groups.some((group) => selected.has(group.id) !== saved.has(group.id));

  useEffect(() => {
    const next = new Set(selectedGroupIds);
    setSelected(next);
    setSaved(next);
  }, [selectedGroupIds]);

  const toggle = (groupId: string) => {
    setState(initialState);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const save = () => {
    if (!changed || pending) return;
    const ids = [...selected];
    setState(initialState);
    startTransition(async () => {
      try {
        const result = await setAthleteGroupsAction(athleteId, ids);
        setState(result);
        if (result.success) {
          setSaved(new Set(ids));
          router.refresh();
        }
      } catch {
        setState({ error: "Training groups could not be updated. Try again.", success: null });
      }
    });
  };

  if (!groups.length) return <p className="text-xs text-[#82929d]">Create a training group first.</p>;

  return (
    <div className="min-w-64 max-w-md">
      <div className="flex flex-wrap gap-2" aria-label={`Training groups for ${athleteName}`}>
        {groups.map((group) => {
          const active = selected.has(group.id);
          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(group.id)}
              disabled={pending}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${active ? "border-[#0a6f7e] bg-[#e4f4f5] text-[#075b67] shadow-sm" : "border-[#dce5e9] bg-white text-[#526778] hover:border-[#9cb4bf] hover:bg-[#f7fafb]"}`}
            >
              <span className="size-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: group.color }} />
              {group.name}
              <span className={`grid size-4 place-items-center rounded-full ${active ? "bg-[#0a6f7e] text-white" : "bg-[#edf2f4] text-transparent"}`}>
                <Check className="size-3" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!changed || pending}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0a304a] px-3 text-xs font-semibold text-white transition hover:bg-[#164c68] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="size-3.5" />{pending ? "Saving…" : "Save groups"}
        </button>
        {!changed && !state.success && <span className="text-[.68rem] text-[#82929d]">Select one or more groups</span>}
        {state.error && <span role="alert" className="text-xs font-semibold text-red-700">{state.error}</span>}
        {state.success && <span role="status" className="text-xs font-semibold text-emerald-700">Saved</span>}
      </div>
    </div>
  );
}
