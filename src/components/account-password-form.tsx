"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { updateAccountPasswordAction, type AccountMutationState } from "@/app/admin/actions";
import type { ProfileListItem } from "@/lib/data";

const initialState: AccountMutationState = { error: null, success: null };

export function AccountPasswordForm({ account }: { account: ProfileListItem }) {
  const [state, action, pending] = useActionState(updateAccountPasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state.success]);
  const athlete = account.role === "athlete";
  return <form ref={formRef} action={action} className="min-w-[260px]">
    <input type="hidden" name="userId" value={account.id} />
    <div className="flex gap-2">
      <input name="password" type="password" required autoComplete="new-password" inputMode={athlete ? "numeric" : "text"} pattern={athlete ? "[0-9]{6}" : "(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{10,64}"} minLength={athlete ? 6 : 10} maxLength={athlete ? 6 : 64} placeholder={athlete ? "New 6-digit PIN" : "New staff password"} aria-label={`New password for ${account.displayName}`} className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#d4dfe4] bg-white px-3 text-xs outline-none focus:border-[#16a5b8]" />
      <button disabled={pending} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d4dfe4] px-3 text-xs font-semibold text-[#304a5d] disabled:opacity-50"><KeyRound className="size-3.5" />{pending ? "Saving…" : "Set"}</button>
    </div>
    {state.error && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="mt-1.5 text-xs font-semibold text-emerald-700">{state.success}</p>}
  </form>;
}
