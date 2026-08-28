import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnvironment } from "@/lib/env";

export default async function HomePage() {
  if (!hasSupabaseEnvironment()) redirect("/athlete");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(profile.role === "athlete" ? "/athlete" : "/staff");
}
