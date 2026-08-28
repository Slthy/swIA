import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasSupabaseEnvironment } from "@/lib/env";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnvironment()) return NextResponse.next();
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
