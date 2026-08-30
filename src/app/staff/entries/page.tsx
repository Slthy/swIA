import { StaffEntriesTable } from "@/components/staff-entries-table";
import { getLogs } from "@/lib/data";
import { getAppProfileForRole } from "@/lib/session";

export default async function StaffEntriesPage() {
  const profile = await getAppProfileForRole(["coach", "admin"], "staff");
  const logs = (await getLogs(profile)).sort((a, b) => b.activityDate.localeCompare(a.activityDate) || b.createdAt.localeCompare(a.createdAt));
  return <div className="space-y-6"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Audit-friendly records</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Team entries</h1><p className="mt-2 text-sm text-[#607181]">Newest activity dates appear first. Administrators can select one or more entries for recoverable deletion.</p></div><StaffEntriesTable logs={logs} canDelete={profile.role === "admin"} /></div>;
}
