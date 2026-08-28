import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getAthletes } from "@/lib/data";

export default async function AthletesPage() {
  const athletes = await getAthletes();
  return <div className="space-y-6"><div><p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Roster</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Athletes</h1></div><Card className="overflow-hidden"><div className="flex items-center gap-3 border-b border-[#e5ecef] px-5 py-4"><Search className="size-4 text-[#82929d]" /><span className="text-sm text-[#718491]">{athletes.length} athlete accounts</span></div><div className="divide-y divide-[#e5ecef]">{athletes.map((athlete) => <div key={athlete.id} className="flex items-center gap-4 px-5 py-4"><span className="grid size-10 place-items-center rounded-xl bg-[#edf4f5] text-[#0a6f7e]"><UserRound className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#17384d]">{athlete.displayName}</p><p className="mt-1 text-xs text-[#82929d]">{athlete.username} · <span className="capitalize">{athlete.teamCategory}</span></p></div><div className="flex gap-2"><Link href={`/staff?scope=individual&athlete=${athlete.id}&range=month`} className="rounded-lg border border-[#d4dfe4] px-3 py-2 text-xs font-semibold text-[#304a5d]">View</Link><Link href={`/staff/log?athlete=${athlete.id}`} className="rounded-lg bg-[#0a304a] px-3 py-2 text-xs font-semibold text-white">Log</Link></div></div>)}</div></Card></div>;
}
