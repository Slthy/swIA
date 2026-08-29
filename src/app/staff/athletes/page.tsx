import Link from "next/link";
import { Pencil, Search, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { filterAndSortAthletes } from "@/lib/athlete-directory";
import { getAthletes } from "@/lib/data";

interface AthleteDirectorySearch {
  q?: string;
  gender?: string;
  sort?: string;
}

export default async function AthletesPage({ searchParams }: { searchParams: Promise<AthleteDirectorySearch> }) {
  const [allAthletes, params] = await Promise.all([getAthletes(), searchParams]);
  const athletes = filterAndSortAthletes(allAthletes, {
    query: params.q,
    gender: params.gender,
    sort: params.sort,
  });
  const selectedGender = ["women", "men", "unassigned"].includes(params.gender ?? "") ? params.gender : "all";
  const selectedSort = params.sort === "gender" ? "gender" : "name";
  const field = "min-h-11 rounded-xl border border-[#d4dfe4] bg-white px-3 text-sm text-[#304a5d] outline-none focus:border-[#16a5b8]";
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Roster</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Athletes</h1>
        <p className="mt-2 text-sm text-[#607181]">Search, filter by gender roster, or sort athletes before opening their profile.</p>
      </div>

      <Card className="p-4 sm:p-5">
        <form method="get" className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_190px_auto]">
          <label className="relative">
            <span className="sr-only">Search athletes</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[#82929d]" />
            <input name="q" defaultValue={params.q} placeholder="Search name or username" className={`${field} w-full pl-10`} />
          </label>
          <label>
            <span className="sr-only">Filter by gender</span>
            <select name="gender" defaultValue={selectedGender} className={`${field} w-full`}>
              <option value="all">All genders</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort athletes</span>
            <select name="sort" defaultValue={selectedSort} className={`${field} w-full`}>
              <option value="name">Sort by name</option>
              <option value="gender">Sort by gender</option>
            </select>
          </label>
          <button className="min-h-11 rounded-xl bg-[#0a304a] px-5 text-sm font-semibold text-white">Apply</button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-[#e5ecef] px-5 py-4 text-sm text-[#718491]">
          Showing {athletes.length} of {allAthletes.length} athlete accounts
        </div>
        <div className="divide-y divide-[#e5ecef]">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="grid size-10 place-items-center rounded-xl bg-[#edf4f5] text-[#0a6f7e]"><UserRound className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#17384d]">{athlete.displayName}</p>
                <p className="mt-1 text-xs text-[#82929d]">{athlete.username} · <span className="capitalize">{athlete.teamCategory}</span></p>
              </div>
              <div className="flex gap-2">
                <Link href={`/staff/athletes/${athlete.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4dfe4] px-3 py-2 text-xs font-semibold text-[#304a5d]"><Pencil className="size-3.5" />Edit</Link>
                <Link href={`/staff?scope=individual&athlete=${athlete.id}&range=month`} className="rounded-lg border border-[#d4dfe4] px-3 py-2 text-xs font-semibold text-[#304a5d]">View</Link>
                <Link href={`/staff/log?athlete=${athlete.id}`} className="rounded-lg bg-[#0a304a] px-3 py-2 text-xs font-semibold text-white">Log</Link>
              </div>
            </div>
          ))}
          {!athletes.length && <p className="px-5 py-10 text-center text-sm text-[#82929d]">No athletes match these filters.</p>}
        </div>
      </Card>
    </div>
  );
}
