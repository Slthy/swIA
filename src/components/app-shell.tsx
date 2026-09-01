import Link from "next/link";
import { BarChart3, ClipboardPlus, History, Home, LogOut, Settings, UserRound, Users } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { PwaRegistration } from "@/components/pwa-registration";
import type { Profile } from "@/lib/types";

const athleteLinks = [
  { href: "/athlete", label: "Home", icon: Home },
  { href: "/athlete/log", label: "Log", icon: ClipboardPlus },
  { href: "/athlete/trends", label: "Trends", icon: BarChart3 },
  { href: "/athlete/history", label: "History", icon: History },
  { href: "/athlete/profile", label: "Profile", icon: UserRound },
];

const staffLinks = [
  { href: "/staff", label: "Overview", icon: BarChart3 },
  { href: "/staff/athletes", label: "Athletes", icon: Users },
  { href: "/staff/entries", label: "Entries", icon: History },
];

export function AppShell({ profile, preview, children }: { profile: Profile; preview: boolean; children: React.ReactNode }) {
  const links = [...(profile.role === "athlete" ? athleteLinks : staffLinks)];
  const firstName = profile.displayName.trim().split(/\s+/)[0] ?? profile.displayName;
  if (profile.role === "admin") links.push({ href: "/admin", label: "Admin", icon: Settings });
  return (
    <div className="min-h-screen min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <PwaRegistration />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-[#082a40] px-5 py-6 text-white lg:flex">
        <Logo inverse />
        <nav className="mt-10 space-y-1" aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/65 transition hover:bg-white/8 hover:text-white"><Icon className="size-4" />{label}</Link>)}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="truncate text-sm font-semibold">{profile.displayName}</p>
          <p className="mt-1 text-xs capitalize text-white/45">{profile.role}{preview ? " · Preview" : ""}</p>
          {preview ? <Link href="/login" className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#ddcfb1]"><LogOut className="size-3.5" />Exit preview</Link> : <form action={signOutAction}><button className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#ddcfb1]"><LogOut className="size-3.5" />Sign out</button></form>}
        </div>
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="mobile-top-header sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#dce5e9]/80 bg-[#f4f7f8]/90 backdrop-blur-lg lg:hidden"><div className="min-w-0 shrink"><Logo /></div><span title={profile.displayName} className="max-w-[30vw] shrink-0 truncate text-xs font-semibold text-[#607181]">{firstName}</span></header>
        <main className="mobile-safe-main mx-auto w-full max-w-[1500px] pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 lg:pb-10 lg:pt-8">{preview && <div className="mb-5 rounded-xl border border-[#dccba8] bg-[#fffaf0] px-4 py-3 text-sm text-[#705a32]"><strong>Preview mode:</strong> showing generated data. Configure Supabase to enable authentication and persistence.</div>}{children}</main>
        <nav className="mobile-bottom-nav z-30 grid border-t border-[#dce5e9] bg-white/95 pt-2 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }} aria-label="Mobile navigation">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-13 flex-col items-center justify-center gap-1 text-[.68rem] font-semibold text-[#607181]"><Icon className="size-5" />{label}</Link>)}
        </nav>
      </div>
    </div>
  );
}
