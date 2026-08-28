import { AppShell } from "@/components/app-shell";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAppProfileForRole(["athlete"], "athlete");
  return <AppShell profile={profile} preview={isPreviewMode()}>{children}</AppShell>;
}
