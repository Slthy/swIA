import { DEMO_ATHLETE, DEMO_COACH } from "@/lib/demo-data";
import { hasSupabaseEnvironment } from "@/lib/env";
import { requireProfile, requireRole } from "@/lib/auth";
import type { Profile, Role } from "@/lib/types";

export function isPreviewMode() {
  return !hasSupabaseEnvironment();
}

export async function getAppProfile(previewRole: "athlete" | "staff" = "athlete"): Promise<Profile> {
  if (isPreviewMode()) return previewRole === "athlete" ? DEMO_ATHLETE : DEMO_COACH;
  return requireProfile();
}

export async function getAppProfileForRole(roles: Role[], previewRole: "athlete" | "staff"): Promise<Profile> {
  if (isPreviewMode()) return previewRole === "athlete" ? DEMO_ATHLETE : DEMO_COACH;
  return requireRole(roles);
}
