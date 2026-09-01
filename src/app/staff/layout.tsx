import { AppShell } from "@/components/app-shell";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAppProfileForRole(["coach", "admin"], "staff");
  return <AppShell profile={profile} preview={isPreviewMode()}>{children}</AppShell>;
}
