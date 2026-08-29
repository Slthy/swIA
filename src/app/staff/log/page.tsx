import type { Metadata } from "next";
import { LogForm } from "@/components/log-form";
import { getAthletes, getLogs } from "@/lib/data";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";
import { buildMonday25yStrokeSchedule } from "@/lib/swim-tests";

export const metadata: Metadata = { title: "Staff log entry" };

export default async function StaffLogPage({ searchParams }: { searchParams: Promise<{ athlete?: string }> }) {
  const params = await searchParams;
  const [profile, athletes] = await Promise.all([getAppProfileForRole(["coach", "admin"], "staff"), getAthletes()]);
  const athleteId = params.athlete && athletes.some((item) => item.id === params.athlete) ? params.athlete : athletes[0]?.id;
  const monday25yStrokes = athleteId ? buildMonday25yStrokeSchedule(await getLogs(profile, { athleteId })) : {};
  return <div className="space-y-5"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Staff entry</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Log for an athlete</h1></div><form className="surface-card flex flex-wrap items-end gap-3 p-4"><label className="flex-1"><span className="mb-1.5 block text-[.65rem] font-bold uppercase tracking-[.1em] text-[#82929d]">Athlete</span><select name="athlete" defaultValue={athleteId} className="min-h-11 w-full rounded-xl border border-[#d4dfe4] bg-white px-3 text-sm font-semibold text-[#304a5d]">{athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.displayName}</option>)}</select></label><button className="min-h-11 rounded-xl bg-[#0a304a] px-5 text-sm font-semibold text-white">Select</button></form>{athleteId && <LogForm key={athleteId} athleteId={athleteId} monday25yStrokes={monday25yStrokes} preview={isPreviewMode()} />}</div>;
}
