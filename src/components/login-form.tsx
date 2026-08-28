"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[#304a5d]">Username</span>
        <span className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d6e0e4] bg-white px-4 focus-within:border-[#16a5b8] focus-within:ring-3 focus-within:ring-[#16a5b8]/10">
          <UserRound className="size-4 text-[#718491]" aria-hidden="true" />
          <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base outline-none" placeholder="firstname.lastname" />
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[#304a5d]">Password or athlete PIN</span>
        <span className="flex min-h-12 items-center gap-3 rounded-xl border border-[#d6e0e4] bg-white px-4 focus-within:border-[#16a5b8] focus-within:ring-3 focus-within:ring-[#16a5b8]/10">
          <LockKeyhole className="size-4 text-[#718491]" aria-hidden="true" />
          <input name="password" type="password" autoComplete="current-password" required className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base outline-none" placeholder="••••••" />
        </span>
      </label>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
      <button disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a304a] px-5 font-semibold text-white shadow-lg shadow-[#0a304a]/15 transition hover:bg-[#124866] disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}<ArrowRight className="size-4" />
      </button>
    </form>
  );
}
