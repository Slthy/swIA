"use client";

import { useActionState } from "react";
import { createAccountAction, type AdminActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const initial: AdminActionState = { error: null, success: null };

export function AdminAccountForm() {
  const [state, action, pending] = useActionState(createAccountAction, initial);
  const field = "min-h-11 w-full rounded-xl border border-[#d4dfe4] bg-white px-3 text-sm outline-none focus:border-[#16a5b8]";
  return <form action={action} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-semibold text-[#526778]">Display name</span><input name="displayName" required className={field} /></label><label><span className="mb-1.5 block text-xs font-semibold text-[#526778]">Username</span><input name="username" required pattern="[a-z0-9.-]+" className={field} /></label><label><span className="mb-1.5 block text-xs font-semibold text-[#526778]">Role</span><select name="role" className={field}><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="admin">Admin</option></select></label><label><span className="mb-1.5 block text-xs font-semibold text-[#526778]">Staff password <span className="font-normal text-[#8a99a2]">(athlete PIN is generated)</span></span><input name="password" type="password" className={field} /></label></div>{state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}{state.success && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><p>{state.success}</p>{state.credential && <p className="mt-2 font-bold">Temporary credential: <code className="rounded bg-white px-2 py-1 text-base">{state.credential}</code></p>}</div>}<Button disabled={pending}>{pending ? "Creating…" : "Create account"}</Button></form>;
}
