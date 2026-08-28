import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { softDeleteLogAction } from "@/app/actions/logs";
import { SESSION_LABELS } from "@/lib/constants";
import { getLogs } from "@/lib/data";
import { getAppProfileForRole } from "@/lib/session";

export default async function StaffEntriesPage() {
  const profile = await getAppProfileForRole(["coach", "admin"], "staff");
  const logs = (await getLogs(profile)).sort((a, b) => b.activityDate.localeCompare(a.activityDate));
  return <div className="space-y-6"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Audit-friendly records</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Team entries</h1></div><Card className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f7fafb] text-[.65rem] uppercase tracking-[.1em] text-[#718491]"><tr><th className="px-5 py-4">Activity date</th><th className="px-5 py-4">Athlete</th><th className="px-5 py-4">Session</th><th className="px-5 py-4">RPE</th><th className="px-5 py-4">Fatigue</th><th className="px-5 py-4">Date source</th>{profile.role === "admin" && <th className="px-5 py-4">Action</th>}</tr></thead><tbody className="divide-y divide-[#e5ecef]">{logs.map((log) => <tr key={log.id} className="hover:bg-[#fafcfc]"><td className="px-5 py-4 font-semibold text-[#304a5d]">{format(parseISO(log.activityDate), "MMM d, yyyy")}</td><td className="px-5 py-4">{log.athleteName}</td><td className="px-5 py-4">{SESSION_LABELS[log.sessionKey]}</td><td className="px-5 py-4">{log.rpe ?? "—"}</td><td className="px-5 py-4">{log.fatigue ?? "—"}</td><td className="px-5 py-4 capitalize text-[#718491]">{log.dateSource.replaceAll("_", " ")}</td>{profile.role === "admin" && <td className="px-5 py-4"><form action={softDeleteLogAction}><input type="hidden" name="id" value={log.id} /><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button></form></td>}</tr>)}</tbody></table></Card></div>;
}
