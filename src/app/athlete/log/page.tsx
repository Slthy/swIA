import type { Metadata } from "next";
import { LogForm } from "@/components/log-form";
import { isSessionKey } from "@/lib/constants";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";

export const metadata: Metadata = { title: "Log activity" };

export default async function AthleteLogPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams;
  const candidate = session ?? null;
  const initialSession = isSessionKey(candidate) ? candidate : undefined;
  await getAppProfileForRole(["athlete"], "athlete");
  return <LogForm initialSession={initialSession} preview={isPreviewMode()} />;
}
