import type { Metadata } from "next";
import { LogForm } from "@/components/log-form";
import { isSessionKey } from "@/lib/constants";
import { isPreviewMode } from "@/lib/session";

export const metadata: Metadata = { title: "Log activity" };

export default async function AthleteLogPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams;
  const candidate = session ?? null;
  const initialSession = isSessionKey(candidate) ? candidate : undefined;
  return <LogForm initialSession={initialSession} preview={isPreviewMode()} />;
}
