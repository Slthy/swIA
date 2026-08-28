import { randomInt } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { ATHLETE_ROSTER } from "../src/lib/constants";
import { internalEmailForUsername, normalizeUsername } from "../src/lib/utils";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const args = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));

async function main() {
  if (args.has("admin-username")) await provisionAdmin();
  if (args.has("roster")) await provisionRoster();
  if (!args.has("admin-username") && !args.has("roster")) {
    process.stdout.write("Usage:\n  npm run provision -- --admin-username=coach.admin --admin-name=\"Coach Admin\" --admin-password=Secure1234\n  npm run provision -- --roster\n");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Provisioning failed: ${message}\n`);
  process.exitCode = 1;
});

async function provisionAdmin() {
  const username = String(args.get("admin-username") ?? "").toLowerCase();
  const displayName = String(args.get("admin-name") ?? "GW SwimTrack Admin");
  const password = String(args.get("admin-password") ?? "");
  if (!/^[a-z0-9.-]{3,80}$/.test(username)) throw new Error("Admin username is invalid.");
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,64}$/.test(password)) throw new Error("Admin password must be 10–64 alphanumeric characters with a letter and number.");
  const { error } = await admin.auth.admin.createUser({ email: internalEmailForUsername(username), password, email_confirm: true, user_metadata: { username, display_name: displayName, role: "admin" } });
  if (error) throw error;
  process.stdout.write(`Created admin ${username}.\n`);
}

async function provisionRoster() {
  const { data: existing } = await admin.from("profiles").select("username");
  const used = new Set((existing ?? []).map((item) => String(item.username).toLowerCase()));
  const credentials: Array<{ name: string; username: string; pin: string }> = [];
  for (const name of ATHLETE_ROSTER) {
    const base = normalizeUsername(name);
    let username = base;
    let suffix = 2;
    while (used.has(username)) username = `${base}.${suffix++}`;
    const pin = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const { error } = await admin.auth.admin.createUser({ email: internalEmailForUsername(username), password: pin, email_confirm: true, user_metadata: { username, display_name: name, role: "athlete" } });
    if (error) throw new Error(`Could not create ${name}: ${error.message}`);
    used.add(username);
    credentials.push({ name, username, pin });
  }
  const csv = ["Name,Username,Temporary PIN", ...credentials.map((row) => [row.name, row.username, row.pin].map(csvCell).join(","))].join("\n");
  const filename = resolve(process.cwd(), `credentials-${new Date().toISOString().replaceAll(":", "-")}.csv`);
  await writeFile(filename, csv, { mode: 0o600 });
  process.stdout.write(`Created ${credentials.length} athletes. Credentials were written once to ${filename}.\n`);
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
