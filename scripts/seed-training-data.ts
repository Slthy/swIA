import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { isValidISODate } from "../src/lib/dates";
import {
  assignTrainingGroups,
  generateTrainingSeedLogs,
  TRAINING_GROUPS,
  type TrainingGroupName,
} from "../src/lib/seed-training-data";

loadEnvConfig(process.cwd());

const args = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");

  const endArgument = args.get("end");
  if (endArgument && !isValidISODate(endArgument)) throw new Error("Use --end=YYYY-MM-DD for a custom seed end date.");
  const endDate = endArgument ? new Date(`${endArgument}T12:00:00`) : new Date();
  const dryRun = args.has("dry-run");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const [{ data: athleteRows, error: athleteError }, { data: actor, error: actorError }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").eq("role", "athlete").eq("active", true).order("display_name").limit(15),
    supabase.from("profiles").select("id, display_name, role").in("role", ["admin", "coach"]).eq("active", true).order("created_at").limit(1).maybeSingle(),
  ]);
  if (athleteError) throw athleteError;
  if (actorError) throw actorError;
  if (!actor) throw new Error("Create an active administrator or coach before seeding training data.");

  const athletes = assignTrainingGroups((athleteRows ?? []).map((athlete) => ({ id: athlete.id, displayName: athlete.display_name })));
  const logs = generateTrainingSeedLogs(athletes, actor.id, endDate);
  printPlan(athletes, logs.length, endDate, actor.display_name, dryRun);
  if (dryRun) return;

  const { data: groups, error: groupError } = await supabase
    .from("groups")
    .upsert(TRAINING_GROUPS, { onConflict: "name" })
    .select("id, name");
  if (groupError) throw groupError;
  const groupIds = new Map((groups ?? []).map((group) => [group.name as TrainingGroupName, group.id]));
  if (groupIds.size !== TRAINING_GROUPS.length) throw new Error("The three training groups could not be resolved.");

  const categoryIds = [...groupIds.values()];
  const { error: membershipDeleteError } = await supabase.from("group_memberships").delete().in("group_id", categoryIds);
  if (membershipDeleteError) throw membershipDeleteError;
  const memberships = athletes.map((athlete) => ({ group_id: groupIds.get(athlete.group)!, athlete_id: athlete.id }));
  const { error: membershipError } = await supabase.from("group_memberships").insert(memberships);
  if (membershipError) throw membershipError;

  let inserted = 0;
  for (let index = 0; index < logs.length; index += 200) {
    const { data, error } = await supabase
      .from("athlete_logs")
      .upsert(logs.slice(index, index + 200), {
        onConflict: "athlete_id,activity_date,session_key",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) throw error;
    inserted += data?.length ?? 0;
  }
  process.stdout.write(`Seed complete: 3 groups, 15 memberships, ${inserted} new logs (${logs.length - inserted} existing logs preserved).\n`);
}

function printPlan(
  athletes: ReturnType<typeof assignTrainingGroups>,
  logCount: number,
  endDate: Date,
  actorName: string,
  dryRun: boolean,
) {
  process.stdout.write(`${dryRun ? "Dry run" : "Seed plan"}: 30 days ending ${endDate.toISOString().slice(0, 10)}, ${logCount} candidate logs, actor ${actorName}.\n`);
  for (const group of TRAINING_GROUPS) {
    const names = athletes.filter((athlete) => athlete.group === group.name).map((athlete) => athlete.displayName).join(", ");
    process.stdout.write(`${group.name}: ${names}\n`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Training seed failed: ${message}\n`);
  process.exitCode = 1;
});
