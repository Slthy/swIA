import Link from "next/link";
import { Activity, BarChart3, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { hasSupabaseEnvironment } from "@/lib/env";

export default function LoginPage() {
  const configured = hasSupabaseEnvironment();
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="fine-grid relative hidden overflow-hidden bg-[#082a40] px-12 py-10 text-white lg:flex lg:flex-col">
        <Logo inverse />
        <div className="my-auto max-w-xl py-16">
          <p className="mb-5 text-sm font-bold uppercase tracking-[.2em] text-[#ddcfb1]">Train with context</p>
          <h1 className="text-5xl font-bold leading-[1.07] tracking-[-.045em]">Readiness, workload, and progress—together.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">A single daily rhythm for GW swimmers and a clearer performance picture for the coaching staff.</p>
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[[Activity, "Daily wellness"], [BarChart3, "Useful trends"], [ShieldCheck, "Private by role"]].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof Activity;
              return <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4"><ItemIcon className="mb-5 size-5 text-[#55c5cf]" /><p className="text-sm font-semibold">{String(label)}</p></div>;
            })}
          </div>
        </div>
        <p className="text-xs text-white/40">GW SwimTrack · Private team application</p>
      </section>
      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-12 lg:hidden"><Logo /></div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-[#8d7448]">Welcome back</p>
          <h2 className="mt-3 text-4xl font-bold tracking-[-.035em] text-[#0a304a]">Sign in to your lane.</h2>
          <p className="mt-3 text-sm leading-6 text-[#607181]">Use the username and password provided by your team administrator.</p>
          {configured ? <LoginForm /> : (
            <div className="mt-8 rounded-2xl border border-[#d9e5e8] bg-white p-5">
              <p className="text-sm font-semibold text-[#0a304a]">Local preview mode</p>
              <p className="mt-1 text-sm leading-6 text-[#607181]">Supabase is not configured, so sign-in is disabled and only generated preview data is available.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/athlete" className="grid min-h-11 place-items-center rounded-xl bg-[#0a304a] px-4 text-sm font-semibold text-white">Athlete preview</Link>
                <Link href="/staff" className="grid min-h-11 place-items-center rounded-xl border border-[#cdd9df] px-4 text-sm font-semibold text-[#0a304a]">Staff preview</Link>
              </div>
            </div>
          )}
          <p className="mt-8 text-center text-xs leading-5 text-[#7c8c97]">Need access or a new PIN? Contact a GW SwimTrack administrator.</p>
        </div>
      </section>
    </main>
  );
}
