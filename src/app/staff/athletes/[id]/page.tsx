import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { AthleteProfileForm } from "@/components/athlete-profile-form";
import { Card } from "@/components/ui/card";
import { getAthletes, getGroups } from "@/lib/data";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";

export default async function StaffAthleteEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, actor, athletes, groups] = await Promise.all([
    params,
    getAppProfileForRole(["coach", "admin"], "staff"),
    getAthletes(),
    getGroups(),
  ]);
  const athlete = athletes.find((item) => item.id === id);
  if (!athlete) notFound();
  const selectedGroupIds = groups.filter((group) => group.athleteIds.includes(athlete.id)).map((group) => group.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/staff/athletes" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a6f7e]"><ArrowLeft className="size-4" />Back to athletes</Link>
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#e5f2f3] text-[#0a6f7e]"><UserRound className="size-5" /></span>
        <div>
          <p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Roster profile</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Edit {athlete.displayName}</h1>
        </div>
      </div>
      <Card className="p-5 sm:p-7">
        <p className="mb-6 text-sm leading-6 text-[#607181]">Coaches can update athlete details, gender rosters, and training groups. Login usernames remain administrator-only.</p>
        <AthleteProfileForm
          athlete={athlete}
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          canEditUsername={actor.role === "admin"}
          canManageGroups
          preview={isPreviewMode()}
        />
      </Card>
    </div>
  );
}
