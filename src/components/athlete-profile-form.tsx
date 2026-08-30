"use client";

import { useActionState } from "react";
import { Check, Save } from "lucide-react";
import {
  updateAthleteProfileAction,
  type AthleteProfileActionState,
} from "@/app/actions/athletes";
import { Button } from "@/components/ui/button";
import type { AthleteListItem, GroupListItem } from "@/lib/data";

const initialState: AthleteProfileActionState = { error: null, success: null };
const field = "min-h-11 w-full rounded-xl border border-[#d4dfe4] bg-white px-3 text-sm text-[#17384d] outline-none focus:border-[#16a5b8] focus:ring-3 focus:ring-[#16a5b8]/10 disabled:cursor-not-allowed disabled:bg-[#f0f4f5] disabled:text-[#82929d]";

interface AthleteProfileFormProps {
  athlete: AthleteListItem;
  groups: GroupListItem[];
  selectedGroupIds: string[];
  canEditUsername: boolean;
  canManageGroups: boolean;
  preview?: boolean;
}

export function AthleteProfileForm({
  athlete,
  groups,
  selectedGroupIds,
  canEditUsername,
  canManageGroups,
  preview = false,
}: AthleteProfileFormProps) {
  const [state, action, pending] = useActionState(updateAthleteProfileAction, initialState);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="athleteId" value={athlete.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#526778]">Display name</span>
          <input name="displayName" required minLength={2} maxLength={120} defaultValue={athlete.displayName} className={field} disabled={preview} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#526778]">Login username</span>
          <input
            name={canEditUsername ? "username" : undefined}
            defaultValue={athlete.username}
            pattern="[a-z0-9.-]+"
            autoCapitalize="none"
            spellCheck={false}
            className={field}
            disabled={!canEditUsername || preview}
          />
          {!canEditUsername && <span className="mt-1.5 block text-xs text-[#82929d]">Only an administrator can change login usernames.</span>}
        </label>
        <label className="block sm:max-w-sm">
          <span className="mb-1.5 block text-xs font-semibold text-[#526778]">Gender roster</span>
          <select name="teamCategory" defaultValue={athlete.teamCategory} className={field} disabled={preview}>
            <option value="unassigned">Unassigned</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
          <span className="mt-1.5 block text-xs text-[#82929d]">Used by the women’s and men’s dashboard filters.</span>
        </label>
      </div>

      <fieldset className="border-t border-[#e5ecef] pt-5">
        <legend className="text-sm font-bold text-[#17384d]">Training groups</legend>
        {canManageGroups ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <label key={group.id} className="group relative flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#dce5e9] bg-white px-3 text-sm font-semibold text-[#304a5d] transition hover:border-[#9cb4bf] has-checked:border-[#0a6f7e] has-checked:bg-[#e4f4f5] has-disabled:cursor-not-allowed has-disabled:opacity-60">
                <input name="groupIds" type="checkbox" value={group.id} defaultChecked={selectedGroupIds.includes(group.id)} disabled={preview} className="peer sr-only" />
                <span className="size-3 rounded-full ring-2 ring-white" style={{ backgroundColor: group.color }} />
                <span className="min-w-0 flex-1 truncate">{group.name}</span>
                <span className="grid size-5 place-items-center rounded-full bg-[#edf2f4] text-transparent transition peer-checked:bg-[#0a6f7e] peer-checked:text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              </label>
            ))}
            {!groups.length && <p className="text-sm text-[#82929d]">No training groups have been created.</p>}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.filter((group) => selectedGroupIds.includes(group.id)).map((group) => (
              <span key={group.id} className="rounded-full border border-[#dce5e9] bg-white px-3 py-2 text-xs font-semibold text-[#304a5d]">
                <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: group.color }} />{group.name}
              </span>
            ))}
            {!selectedGroupIds.length && <p className="text-sm text-[#82929d]">No training group assigned. Ask a coach or administrator to update it.</p>}
          </div>
        )}
      </fieldset>

      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.success}</p>}
      {preview ? (
        <p className="rounded-xl bg-[#fffaf0] px-4 py-3 text-sm text-[#705a32]">Profile editing is disabled in preview mode.</p>
      ) : (
        <Button disabled={pending}><Save className="size-4" />{pending ? "Saving…" : "Save information"}</Button>
      )}
    </form>
  );
}
