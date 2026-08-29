import { UserRound } from "lucide-react";
import { AthleteProfileForm } from "@/components/athlete-profile-form";
import { Card } from "@/components/ui/card";
import { getGroups } from "@/lib/data";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";

export default async function AthleteProfilePage() {
  const profile = await getAppProfileForRole(["athlete"], "athlete");
  const groups = await getGroups();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#e5f2f3] text-[#0a6f7e]"><UserRound className="size-5" /></span>
        <div>
          <p className="text-[.68rem] font-bold uppercase tracking-[.15em] text-[#8d7448]">Your account</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-[#0a304a]">Athlete information</h1>
        </div>
      </div>
      <Card className="p-5 sm:p-7">
        <p className="mb-6 text-sm leading-6 text-[#607181]">Keep your name and gender roster current. Your training groups are managed by team staff.</p>
        <AthleteProfileForm
          athlete={{
            id: profile.id,
            displayName: profile.displayName,
            username: profile.username,
            teamCategory: profile.teamCategory ?? "unassigned",
            active: true,
          }}
          groups={groups}
          selectedGroupIds={profile.groupIds}
          canEditUsername={false}
          canManageGroups={false}
          preview={isPreviewMode()}
        />
      </Card>
    </div>
  );
}
