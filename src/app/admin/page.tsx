import {
  createGroupAction,
  setAthleteGroupsAction,
  updateAthleteCategoryAction,
} from "@/app/admin/actions";
import { restoreLogAction } from "@/app/actions/logs";
import { AdminAccountForm } from "@/components/admin-account-form";
import { AdminAccountsTable } from "@/components/admin-accounts-table";
import { ResetPinButton } from "@/components/reset-pin-button";
import { Card } from "@/components/ui/card";
import { SESSION_LABELS } from "@/lib/constants";
import { getAthletes, getDeletedLogs, getGroups, getProfiles } from "@/lib/data";
import { getAppProfileForRole } from "@/lib/session";

export default async function AdminPage() {
  const profile = await getAppProfileForRole(["admin"], "staff");
  const [athletes, profiles, groups, deletedLogs] = await Promise.all([
    getAthletes(),
    getProfiles(),
    getGroups(),
    getDeletedLogs(profile),
  ]);
  const field = "min-h-10 rounded-lg border border-[#d4dfe4] bg-white px-3 text-sm";

  return <div className="space-y-6">
    <div>
      <p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Administration</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Team setup</h1>
      <p className="mt-2 text-sm text-[#607181]">Provision accounts, manage credentials and access, assign roster categories, and create reusable training groups.</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-6"><h2 className="mb-5 text-lg font-bold text-[#17384d]">Create account</h2><AdminAccountForm /></Card>
      <Card className="p-6">
        <h2 className="text-lg font-bold text-[#17384d]">Training groups</h2>
        <form action={createGroupAction} className="mt-4 flex gap-3"><input name="name" required placeholder="Distance group" className={`${field} min-w-0 flex-1`} /><input name="color" type="color" defaultValue="#2d7db6" className="h-10 w-12 rounded-lg border border-[#d4dfe4] bg-white p-1" /><button className="rounded-lg bg-[#0a304a] px-4 text-sm font-semibold text-white">Add</button></form>
        <div className="mt-5 flex flex-wrap gap-2">{groups.length ? groups.map((group) => <span key={group.id} className="rounded-full border border-[#dce5e9] bg-white px-3 py-2 text-xs font-semibold text-[#304a5d]"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: group.color }} />{group.name} · {group.athleteIds.length}</span>) : <p className="text-sm text-[#82929d]">No groups yet.</p>}</div>
      </Card>
    </div>

    <Card className="overflow-x-auto">
      <div className="border-b border-[#e5ecef] px-5 py-4"><h2 className="font-bold text-[#17384d]">Athlete categories and groups</h2></div>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#f7fafb] text-[.65rem] uppercase tracking-[.1em] text-[#718491]"><tr><th className="px-5 py-3">Athlete</th><th className="px-5 py-3">Team category</th><th className="px-5 py-3">Groups</th><th className="px-5 py-3">Credentials</th></tr></thead>
        <tbody className="divide-y divide-[#e5ecef]">{athletes.map((athlete) => <tr key={athlete.id}>
          <td className="px-5 py-4"><p className="font-semibold text-[#304a5d]">{athlete.displayName}</p><p className="mt-1 text-xs text-[#82929d]">{athlete.username}</p></td>
          <td className="px-5 py-4"><form action={updateAthleteCategoryAction} className="flex gap-2"><input type="hidden" name="athleteId" value={athlete.id} /><select name="category" defaultValue={athlete.teamCategory} className={field}><option value="unassigned">Unassigned</option><option value="men">Men</option><option value="women">Women</option></select><button className="rounded-lg border border-[#d4dfe4] px-3 text-xs font-semibold">Save</button></form></td>
          <td className="px-5 py-4"><form action={setAthleteGroupsAction} className="flex gap-2"><input type="hidden" name="athleteId" value={athlete.id} /><select name="groupIds" multiple defaultValue={groups.filter((group) => group.athleteIds.includes(athlete.id)).map((group) => group.id)} className={`${field} min-w-36`}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><button className="rounded-lg border border-[#d4dfe4] px-3 text-xs font-semibold">Save</button></form></td>
          <td className="px-5 py-4"><ResetPinButton userId={athlete.id} /></td>
        </tr>)}</tbody>
      </table>
    </Card>

    <AdminAccountsTable accounts={profiles} currentAccountId={profile.id} />

    {deletedLogs.length > 0 && <Card className="overflow-hidden">
      <div className="border-b border-[#e5ecef] px-5 py-4"><h2 className="font-bold text-[#17384d]">Deleted logs</h2><p className="mt-1 text-xs text-[#718491]">Restore entries removed from the team entries page.</p></div>
      <div className="divide-y divide-[#e5ecef]">{deletedLogs.map((log) => <div key={log.id} className="flex items-center gap-4 px-5 py-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#17384d]">{log.athleteName} · {SESSION_LABELS[log.sessionKey]}</p><p className="mt-1 text-xs text-[#82929d]">{log.activityDate}</p></div><form action={restoreLogAction}><input type="hidden" name="id" value={log.id} /><button className="rounded-lg border border-[#d4dfe4] px-3 py-2 text-xs font-semibold">Restore</button></form></div>)}</div>
    </Card>}
  </div>;
}
