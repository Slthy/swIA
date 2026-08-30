"use client";

import { useActionState, useEffect, useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { deleteAccountsAction, toggleAccountAction, type AccountMutationState } from "@/app/admin/actions";
import { AccountPasswordForm } from "@/components/account-password-form";
import { Card } from "@/components/ui/card";
import type { ProfileListItem } from "@/lib/data";

const initialState: AccountMutationState = { error: null, success: null };

export function AdminAccountsTable({ accounts, currentAccountId }: { accounts: ProfileListItem[]; currentAccountId: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState(deleteAccountsAction, initialState);
  const deletable = accounts.filter((account) => account.id !== currentAccountId);
  const allSelected = deletable.length > 0 && selected.size === deletable.length;

  useEffect(() => { if (state.success) setSelected(new Set()); }, [state.success]);
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return <Card className="overflow-hidden">
    <div className="flex flex-wrap items-center gap-3 border-b border-[#e5ecef] bg-[#f7fafb] px-5 py-4">
      <div><h2 className="font-bold text-[#17384d]">All accounts</h2><p className="mt-1 text-xs text-[#718491]">Set passwords, deactivate access, or permanently delete selected accounts.</p></div>
      <form action={action} onSubmit={(event) => {
        if (!window.confirm(`Permanently delete ${selected.size} selected ${selected.size === 1 ? "account" : "accounts"}? Login access cannot be restored; historical records will be retained.`)) event.preventDefault();
      }} className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {[...selected].map((id) => <input key={id} type="hidden" name="accountIds" value={id} />)}
        <span className="text-xs font-semibold text-[#607181]">{selected.size} selected</span>
        <button type="submit" disabled={!selected.size || pending} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#bf4545] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="size-3.5" />{pending ? "Deleting…" : "Delete selected"}</button>
      </form>
      {state.error && <p role="alert" className="basis-full text-xs font-semibold text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="basis-full text-xs font-semibold text-emerald-700">{state.success}</p>}
    </div>
    <div className="flex items-center gap-3 border-b border-[#e5ecef] px-5 py-3 text-xs font-semibold text-[#607181]"><input type="checkbox" aria-label="Select all deletable accounts" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(deletable.map((account) => account.id)))} className="size-4 accent-[#0a6f7e]" />Select all accounts except your current login</div>
    <div className="divide-y divide-[#e5ecef]">{accounts.map((account) => {
      const current = account.id === currentAccountId;
      return <div key={account.id} className={selected.has(account.id) ? "bg-[#fff7f7] px-5 py-4" : "px-5 py-4"}>
        <div className="flex flex-wrap items-center gap-4">
          <input type="checkbox" aria-label={`Select account ${account.displayName}`} disabled={current} checked={selected.has(account.id)} onChange={() => toggle(account.id)} className="size-4 accent-[#bf4545] disabled:opacity-30" />
          <div className="min-w-48 flex-1"><p className="truncate text-sm font-semibold text-[#17384d]">{account.displayName}{current && <span className="ml-2 rounded-full bg-[#e4f4f5] px-2 py-1 text-[.62rem] uppercase tracking-wide text-[#0a6f7e]">Current</span>}</p><p className="mt-1 text-xs capitalize text-[#82929d]">{account.username} · {account.role} · {account.active ? "active" : "inactive"}</p></div>
          <AccountPasswordForm account={account} />
          <form action={toggleAccountAction}><input type="hidden" name="userId" value={account.id} /><input type="hidden" name="active" value={String(!account.active)} /><button disabled={current} className="min-h-10 rounded-lg border border-[#d4dfe4] px-3 text-xs font-semibold text-[#304a5d] disabled:cursor-not-allowed disabled:opacity-35">{account.active ? "Deactivate" : "Activate"}</button></form>
        </div>
      </div>;
    })}</div>
    <div className="flex gap-3 border-t border-[#e5ecef] bg-[#fffaf0] px-5 py-4 text-xs leading-5 text-[#705a32]"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p>Account deletion revokes authentication permanently and removes group membership. Historical entries and audit attribution remain intact.</p></div>
  </Card>;
}
