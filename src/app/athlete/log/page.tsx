import type { Metadata } from "next";
import { LogForm } from "@/components/log-form";
import { isSessionKey } from "@/lib/constants";
import { getLogs } from "@/lib/data";
import { getAppProfileForRole, isPreviewMode } from "@/lib/session";
import { buildMonday25yStrokeSchedule } from "@/lib/swim-tests";

export const metadata: Metadata = { title: "Log activity" };

export default async function AthleteLogPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams;
  const candidate = session ?? null;
  const initialSession = isSessionKey(candidate) ? candidate : undefined;
  const profile = await getAppProfileForRole(["athlete"], "athlete");
  const monday25yStrokes = buildMonday25yStrokeSchedule(await getLogs(profile));
  return <LogForm initialSession={initialSession} monday25yStrokes={monday25yStrokes} preview={isPreviewMode()} />;
}
