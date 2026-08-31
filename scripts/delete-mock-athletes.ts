import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MOCK_TRAINING_ATHLETES } from "../src/lib/seed-training-data";

loadEnvConfig(process.cwd());

const execute = process.argv.slice(2).includes("--execute");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const mockNames = MOCK_TRAINING_ATHLETES.map((athlete) => athlete.displayName);
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "athlete")
    .in("display_name", mockNames)
    .order("display_name");
  if (profileError) throw profileError;

  const ids = (profiles ?? []).map((profile) => profile.id as string);
  if (!ids.length) {
    process.stdout.write("No seeded mock athlete accounts remain.\n");
    return;
  }

  const [athletes, logs, memberships, auditEvents, authUsers] = await Promise.all([
    collectRows(admin, "athletes", "user_id", ids),
    collectRows(admin, "athlete_logs", "athlete_id", ids),
    collectRows(admin, "group_memberships", "athlete_id", ids),
    collectRows(admin, "audit_events", "actor_id", ids),
    Promise.all(ids.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error) throw error;
      return data.user;
    })),
  ]);

  process.stdout.write(`Found ${ids.length} mock athletes, ${logs.length} entries, and ${memberships.length} group assignments.\n`);
  if (!execute) {
    process.stdout.write("Preview only. Re-run with --execute to back up and permanently delete this data.\n");
    return;
  }

  const backupFile = resolve("/tmp", `gw-swimtrack-mock-athlete-backup-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(backupFile, JSON.stringify({ profiles, athletes, logs, memberships, auditEvents, authUsers }, null, 2), { mode: 0o600 });

  const { error: logError } = await admin.from("athlete_logs").delete().in("athlete_id", ids);
  if (logError) throw logError;
  const { error: membershipError } = await admin.from("group_memberships").delete().in("athlete_id", ids);
  if (membershipError) throw membershipError;
  const { error: auditError } = await admin.from("audit_events").update({ actor_id: null }).in("actor_id", ids);
  if (auditError) throw auditError;

  for (const profile of profiles ?? []) {
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) throw new Error(`Could not delete ${profile.display_name}: ${error.message}`);
  }

  const [{ count: remainingProfiles, error: remainingProfileError }, { count: remainingLogs, error: remainingLogError }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).in("id", ids),
    admin.from("athlete_logs").select("*", { count: "exact", head: true }).in("athlete_id", ids),
  ]);
  if (remainingProfileError) throw remainingProfileError;
  if (remainingLogError) throw remainingLogError;
  if (remainingProfiles || remainingLogs) throw new Error(`Cleanup verification failed: ${remainingProfiles ?? 0} profiles and ${remainingLogs ?? 0} entries remain.`);

  process.stdout.write(`Deleted ${ids.length} mock athletes and ${logs.length} entries. Backup: ${backupFile}\n`);
}

async function collectRows(admin: SupabaseClient, table: string, column: string, ids: string[]) {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select("*").in(column, ids).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) return rows;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Mock-athlete cleanup failed: ${message}\n`);
  process.exitCode = 1;
});
