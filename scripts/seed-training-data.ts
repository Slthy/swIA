import { randomInt } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { subDays } from "date-fns";
import { isValidISODate, mondayOfWeek, toLocalISODate } from "../src/lib/dates";
import {
  generateTrainingSeedLogs,
  MOCK_TRAINING_ATHLETES,
  TRAINING_GROUPS,
  type AssignedSeedAthlete,
  type TrainingGroupName,
  type TrainingSeedLogRow,
} from "../src/lib/seed-training-data";
import { internalEmailForUsername } from "../src/lib/utils";

loadEnvConfig(process.cwd());

const args = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...value] = argument.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));

interface StoredLog extends TrainingSeedLogRow {
  id: string;
  created_at: string;
  updated_at: string;
}

interface CategoryProfile {
  id: string;
  displayName: string;
  username: string;
  group: TrainingGroupName;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");

  const endArgument = args.get("end");
  if (endArgument && !isValidISODate(endArgument)) throw new Error("Use --end=YYYY-MM-DD for a custom seed end date.");
  const endDate = endArgument ? new Date(`${endArgument}T12:00:00`) : new Date();
  const startDate = toLocalISODate(subDays(endDate, 29));
  const endDateISO = toLocalISODate(endDate);
  const dryRun = args.has("dry-run");
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: actor, error: actorError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .in("role", ["admin", "coach"])
    .eq("active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (actorError) throw actorError;
  if (!actor) throw new Error("Create an active administrator or coach before seeding training data.");

  const groups = await resolveGroups(supabase, !dryRun);
  const legacyAthletes = await getLegacyCategoryAthletes(supabase, groups);
  const expectedLegacyLogs = generateTrainingSeedLogs(
    legacyAthletes.map((athlete, athleteIndex) => ({ ...athlete, athleteIndex })),
    actor.id,
    endDate,
  );
  const storedLegacyLogs = await getStoredSeedLogs(supabase, legacyAthletes.map((athlete) => athlete.id), actor.id, startDate, endDateISO);
  const matchingLegacyLogs = findExactSeedMatches(storedLegacyLogs, expectedLegacyLogs);
  const mockPreview = MOCK_TRAINING_ATHLETES.map((athlete, athleteIndex) => ({
    ...athlete,
    athleteIndex,
    id: `00000000-0000-4000-8000-${String(athleteIndex).padStart(12, "0")}`,
  }));
  const candidateMockLogs = generateTrainingSeedLogs(mockPreview, actor.id, endDate);

  printPlan({
    actorName: actor.display_name,
    startDate,
    endDate: endDateISO,
    legacyAthletes,
    storedLegacyCount: storedLegacyLogs.length,
    matchingLegacyCount: matchingLegacyLogs.length,
    mockLogCount: candidateMockLogs.length,
    dryRun,
  });
  if (dryRun) return;

  const { athletes: mockAthletes, credentials } = await ensureMockAthletes(supabase);
  await assignMockGenderRosters(supabase, mockAthletes);
  const mockLogs = generateTrainingSeedLogs(mockAthletes, actor.id, endDate);
  const credentialFile = credentials.length ? await writeCredentialFile(credentials) : null;
  const inserted = await insertMissingLogs(supabase, mockLogs);
  const testRefresh = await replaceMockStrokeTestLogs(supabase, mockLogs);

  const groupIds = new Map(groups.map((group) => [group.name, group.id]));
  const categoryIds = [...groupIds.values()];
  const { error: membershipDeleteError } = await supabase
    .from("group_memberships")
    .delete()
    .in("group_id", categoryIds)
    .in("athlete_id", mockAthletes.map((athlete) => athlete.id));
  if (membershipDeleteError) throw membershipDeleteError;
  const { error: membershipError } = await supabase.from("group_memberships").insert(
    mockAthletes.map((athlete) => ({ group_id: groupIds.get(athlete.group)!, athlete_id: athlete.id })),
  );
  if (membershipError) throw membershipError;

  let backupFile: string | null = null;
  if (matchingLegacyLogs.length) {
    backupFile = resolve("/tmp", `gw-swimtrack-real-athlete-seed-backup-${new Date().toISOString().replaceAll(":", "-")}.json`);
    await writeFile(backupFile, JSON.stringify(matchingLegacyLogs, null, 2), { mode: 0o600 });
    for (let index = 0; index < matchingLegacyLogs.length; index += 200) {
      const ids = matchingLegacyLogs.slice(index, index + 200).map((log) => log.id);
      const { error } = await supabase.from("athlete_logs").delete().in("id", ids);
      if (error) throw error;
    }
  }

  const verification = await verifyReplacement(supabase, mockAthletes, groups, mockLogs, startDate, endDateISO, matchingLegacyLogs.map((log) => log.id));
  process.stdout.write(`Replacement complete: ${verification.memberships} mock memberships, ${verification.mockLogs} mock logs, and ${verification.genderRosters} gender rosters verified.\n`);
  process.stdout.write(`${verification.testRows} daily test rows verified across ${verification.assigned25yStrokes} assigned 25y strokes; ${verification.matchingStrokeWeeks} complete weeks support like-stroke progression and ${verification.differentStrokeWeeks} demonstrate independent assignment.\n`);
  process.stdout.write(`${verification.freestyle3x100Rows} freestyle-only 3×100 results verified; non-freestyle pace fields are empty.\n`);
  process.stdout.write(`${matchingLegacyLogs.length} matching real-athlete seed logs were removed; ${storedLegacyLogs.length - matchingLegacyLogs.length} non-matching rows were preserved.\n`);
  process.stdout.write(`${inserted} mock logs were newly inserted; ${mockLogs.length - inserted} existing identities were found before the test refresh.\n`);
  process.stdout.write(`${testRefresh.refreshed} deterministic mock swim-test rows were refreshed with stroke-specific times.\n`);
  if (testRefresh.backupFile) process.stdout.write(`Replaced mock-test backup (mode 0600): ${testRefresh.backupFile}\n`);
  if (credentialFile) process.stdout.write(`New mock credentials: ${credentialFile}\n`);
  if (backupFile) process.stdout.write(`Removed-row backup (mode 0600): ${backupFile}\n`);
}

async function resolveGroups(supabase: SupabaseClient, createMissing: boolean) {
  const names = TRAINING_GROUPS.map((group) => group.name);
  const request = createMissing
    ? supabase.from("groups").upsert(TRAINING_GROUPS, { onConflict: "name" }).select("id, name")
    : supabase.from("groups").select("id, name").in("name", names);
  const { data, error } = await request;
  if (error) throw error;
  if ((data ?? []).length !== TRAINING_GROUPS.length) {
    if (!createMissing) throw new Error("The Sprint, Mid-D, and Distance groups must exist before running this replacement dry run.");
    throw new Error("The three training groups could not be resolved.");
  }
  return (data ?? []) as Array<{ id: string; name: TrainingGroupName }>;
}

async function getLegacyCategoryAthletes(supabase: SupabaseClient, groups: Array<{ id: string; name: TrainingGroupName }>): Promise<CategoryProfile[]> {
  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const { data: memberships, error: membershipError } = await supabase
    .from("group_memberships")
    .select("group_id, athlete_id")
    .in("group_id", groups.map((group) => group.id));
  if (membershipError) throw membershipError;
  const athleteIds = [...new Set((memberships ?? []).map((membership) => membership.athlete_id))];
  if (!athleteIds.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", athleteIds);
  if (profileError) throw profileError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return TRAINING_GROUPS.flatMap((trainingGroup) =>
    (memberships ?? [])
      .filter((membership) => groupNameById.get(membership.group_id) === trainingGroup.name)
      .map((membership) => profileById.get(membership.athlete_id))
      .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile) && !profile!.username.startsWith("mock."))
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map((profile) => ({ id: profile.id, displayName: profile.display_name, username: profile.username, group: trainingGroup.name })),
  );
}

async function getStoredSeedLogs(
  supabase: SupabaseClient,
  athleteIds: string[],
  actorId: string,
  startDate: string,
  endDate: string,
): Promise<StoredLog[]> {
  if (!athleteIds.length) return [];
  const rows: StoredLog[] = [];
  for (let offset = 0; ; offset += 1_000) {
    const { data, error } = await supabase
      .from("athlete_logs")
      .select("*")
      .in("athlete_id", athleteIds)
      .eq("date_source", "staff_backfill")
      .eq("created_by", actorId)
      .gte("activity_date", startDate)
      .lte("activity_date", endDate)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as StoredLog[]));
    if ((data ?? []).length < 1_000) break;
  }
  return rows;
}

function findExactSeedMatches(stored: StoredLog[], expected: TrainingSeedLogRow[]): StoredLog[] {
  const expectedByIdentity = new Map(expected.map((log) => [identity(log), log]));
  return stored.filter((log) => {
    const candidate = expectedByIdentity.get(identity(log));
    return candidate ? comparableFields.every((field) => sameValue(log[field], candidate[field])) : false;
  });
}

const comparableFields = [
  "log_type", "date_source", "soreness", "academic_stress", "nutrition", "resting_hr", "sleep_hours", "rpe", "fatigue",
  "pace_3x100_seconds", "time_25y_seconds", "kick_count", "stroke_count", "zone1_minutes", "zone2_minutes", "zone3_minutes",
  "zone4_minutes", "zone5_minutes", "created_by", "updated_by", "time_25y_breaststroke_seconds", "time_25y_freestyle_seconds",
  "time_25y_fly_seconds", "time_25y_backstroke_seconds", "pace_3x100_breaststroke_seconds", "pace_3x100_freestyle_seconds",
  "pace_3x100_fly_seconds", "pace_3x100_backstroke_seconds", "pace_3x100_im_seconds",
] as const satisfies ReadonlyArray<keyof TrainingSeedLogRow>;

function identity(log: Pick<TrainingSeedLogRow, "athlete_id" | "activity_date" | "session_key">) {
  return `${log.athlete_id}:${log.activity_date}:${log.session_key}`;
}

function sameValue(actual: unknown, expected: unknown) {
  if (actual === null || expected === null) return actual === expected;
  if (typeof expected === "number") return Number(actual) === expected;
  return actual === expected;
}

async function ensureMockAthletes(supabase: SupabaseClient): Promise<{
  athletes: AssignedSeedAthlete[];
  credentials: Array<{ name: string; username: string; pin: string }>;
}> {
  const usernames = MOCK_TRAINING_ATHLETES.map((athlete) => athlete.username);
  const { data: existing, error: existingError } = await supabase.from("profiles").select("id, username").in("username", usernames);
  if (existingError) throw existingError;
  const existingByUsername = new Map((existing ?? []).map((profile) => [String(profile.username).toLowerCase(), profile.id]));
  const credentials: Array<{ name: string; username: string; pin: string }> = [];

  for (const mock of MOCK_TRAINING_ATHLETES) {
    if (existingByUsername.has(mock.username)) continue;
    const pin = randomPin();
    const { data, error } = await supabase.auth.admin.createUser({
      email: internalEmailForUsername(mock.username),
      password: pin,
      email_confirm: true,
      user_metadata: { username: mock.username, display_name: mock.displayName, role: "athlete" },
    });
    if (error || !data.user) throw error ?? new Error(`Could not create ${mock.displayName}.`);
    existingByUsername.set(mock.username, data.user.id);
    credentials.push({ name: mock.displayName, username: mock.username, pin });
  }

  const athletes = MOCK_TRAINING_ATHLETES.map((mock, athleteIndex) => ({
    id: existingByUsername.get(mock.username)!,
    displayName: mock.displayName,
    group: mock.group,
    athleteIndex,
  }));
  if (athletes.some((athlete) => !athlete.id)) throw new Error("All 15 mock athlete profiles could not be resolved.");
  return { athletes, credentials };
}

async function assignMockGenderRosters(supabase: SupabaseClient, athletes: AssignedSeedAthlete[]) {
  const athleteIdByUsername = new Map(
    athletes.map((athlete) => [MOCK_TRAINING_ATHLETES[athlete.athleteIndex].username, athlete.id]),
  );
  for (const teamCategory of ["women", "men"] as const) {
    const ids = MOCK_TRAINING_ATHLETES
      .filter((athlete) => athlete.teamCategory === teamCategory)
      .map((athlete) => athleteIdByUsername.get(athlete.username))
      .filter((id): id is string => Boolean(id));
    const { error } = await supabase
      .from("athletes")
      .update({ team_category: teamCategory, updated_at: new Date().toISOString() })
      .in("user_id", ids);
    if (error) throw error;
  }
}

async function writeCredentialFile(credentials: Array<{ name: string; username: string; pin: string }>) {
  const csv = ["Name,Username,Temporary PIN", ...credentials.map((row) => [row.name, row.username, row.pin].map(csvCell).join(","))].join("\n");
  const filename = resolve(process.cwd(), `credentials-mock-athletes-${new Date().toISOString().replaceAll(":", "-")}.csv`);
  await writeFile(filename, csv, { mode: 0o600 });
  return filename;
}

async function insertMissingLogs(supabase: SupabaseClient, logs: TrainingSeedLogRow[]) {
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
  return inserted;
}

async function replaceMockStrokeTestLogs(supabase: SupabaseClient, logs: TrainingSeedLogRow[]) {
  const testLogs = logs.filter((log) => log.log_type === "monday_test" || log.log_type === "friday_test");
  const athleteIds = [...new Set(testLogs.map((log) => log.athlete_id))];
  const dates = testLogs.map((log) => log.activity_date).sort();
  const { data: stored, error: storedError } = await supabase
    .from("athlete_logs")
    .select("*")
    .in("athlete_id", athleteIds)
    .in("session_key", ["monday_am_test", "friday_am_test"])
    .gte("activity_date", dates[0])
    .lte("activity_date", dates.at(-1)!);
  if (storedError) throw storedError;
  const storedRows = (stored ?? []) as StoredLog[];
  const expectedByIdentity = new Map(testLogs.map((log) => [identity(log), log]));
  const alreadyCurrent = storedRows.length === testLogs.length && storedRows.every((row) => {
    const expected = expectedByIdentity.get(identity(row));
    return expected && comparableFields.every((field) => sameValue(row[field], expected[field]));
  });
  if (alreadyCurrent) return { refreshed: 0, backupFile: null };
  if (storedRows.length !== testLogs.length) {
    throw new Error(`Expected ${testLogs.length} existing mock test rows before replacement, found ${storedRows.length}.`);
  }

  const backupFile = resolve("/tmp", `gw-swimtrack-mock-test-backup-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(backupFile, JSON.stringify(storedRows, null, 2), { mode: 0o600 });
  try {
    for (let index = 0; index < storedRows.length; index += 100) {
      const { error } = await supabase.from("athlete_logs").delete().in("id", storedRows.slice(index, index + 100).map((row) => row.id));
      if (error) throw error;
    }
    for (let index = 0; index < testLogs.length; index += 100) {
      const { error } = await supabase
        .from("athlete_logs")
        .insert(testLogs.slice(index, index + 100));
      if (error) throw error;
    }
  } catch (error) {
    await supabase
      .from("athlete_logs")
      .delete()
      .in("athlete_id", athleteIds)
      .in("session_key", ["monday_am_test", "friday_am_test"])
      .gte("activity_date", dates[0])
      .lte("activity_date", dates.at(-1)!);
    for (let index = 0; index < storedRows.length; index += 100) {
      await supabase.from("athlete_logs").insert(storedRows.slice(index, index + 100));
    }
    throw error;
  }
  return { refreshed: testLogs.length, backupFile };
}

async function verifyReplacement(
  supabase: SupabaseClient,
  athletes: AssignedSeedAthlete[],
  groups: Array<{ id: string; name: TrainingGroupName }>,
  expectedLogs: TrainingSeedLogRow[],
  startDate: string,
  endDate: string,
  removedIds: string[],
) {
  const [
    { count: memberships, error: membershipError },
    { count: mockLogs, error: logError },
    { data: genderRosters, error: genderError },
  ] = await Promise.all([
    supabase.from("group_memberships").select("*", { count: "exact", head: true }).in("group_id", groups.map((group) => group.id)).in("athlete_id", athletes.map((athlete) => athlete.id)),
    supabase.from("athlete_logs").select("*", { count: "exact", head: true }).in("athlete_id", athletes.map((athlete) => athlete.id)).gte("activity_date", startDate).lte("activity_date", endDate).is("deleted_at", null),
    supabase.from("athletes").select("user_id, team_category").in("user_id", athletes.map((athlete) => athlete.id)),
  ]);
  if (membershipError) throw membershipError;
  if (logError) throw logError;
  if (genderError) throw genderError;
  if (memberships !== 15) throw new Error(`Expected 15 mock memberships, found ${memberships ?? 0}.`);
  if (mockLogs !== expectedLogs.length) throw new Error(`Expected ${expectedLogs.length} mock logs, found ${mockLogs ?? 0}.`);
  const expectedCategoryById = new Map(
    athletes.map((athlete) => [athlete.id, MOCK_TRAINING_ATHLETES[athlete.athleteIndex].teamCategory]),
  );
  if (genderRosters?.length !== 15 || genderRosters.some((athlete) => expectedCategoryById.get(athlete.user_id) !== athlete.team_category)) {
    throw new Error("The 15 mock gender rosters do not match the deterministic seed plan.");
  }
  const testVerification = await verifyMockTestRows(supabase, athletes, expectedLogs, startDate, endDate);
  for (let index = 0; index < removedIds.length; index += 200) {
    const { count, error } = await supabase.from("athlete_logs").select("*", { count: "exact", head: true }).in("id", removedIds.slice(index, index + 200));
    if (error) throw error;
    if (count) throw new Error(`${count} targeted real-athlete seed logs still exist.`);
  }
  return { memberships, mockLogs, genderRosters: genderRosters.length, ...testVerification };
}

const specific25yFields = [
  "time_25y_breaststroke_seconds",
  "time_25y_freestyle_seconds",
  "time_25y_fly_seconds",
  "time_25y_backstroke_seconds",
] as const;

const nonFreestyle3x100Fields = [
  "pace_3x100_breaststroke_seconds",
  "pace_3x100_fly_seconds",
  "pace_3x100_backstroke_seconds",
  "pace_3x100_im_seconds",
] as const;

async function verifyMockTestRows(
  supabase: SupabaseClient,
  athletes: AssignedSeedAthlete[],
  expectedLogs: TrainingSeedLogRow[],
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from("athlete_logs")
    .select("athlete_id, activity_date, session_key, time_25y_seconds, time_25y_breaststroke_seconds, time_25y_freestyle_seconds, time_25y_fly_seconds, time_25y_backstroke_seconds, kick_count, stroke_count, pace_3x100_seconds, pace_3x100_breaststroke_seconds, pace_3x100_freestyle_seconds, pace_3x100_fly_seconds, pace_3x100_backstroke_seconds, pace_3x100_im_seconds")
    .in("athlete_id", athletes.map((athlete) => athlete.id))
    .in("session_key", ["monday_am_test", "friday_am_test"])
    .gte("activity_date", startDate)
    .lte("activity_date", endDate)
    .is("deleted_at", null);
  if (error) throw error;
  const expectedTests = expectedLogs.filter((log) => log.session_key === "monday_am_test" || log.session_key === "friday_am_test");
  if (data?.length !== expectedTests.length) throw new Error(`Expected ${expectedTests.length} mock swim-test rows, found ${data?.length ?? 0}.`);

  const byAthleteWeek = new Map<string, Array<{ session: string; stroke: string }>>();
  const assignedStrokes = new Set<string>();
  const times = new Set<number>();
  const kickCounts = new Set<number>();
  const strokeCounts = new Set<number>();
  const freestylePaces = new Set<number>();
  for (const row of data ?? []) {
    const entered = specific25yFields.flatMap((field) => {
      const raw = row[field];
      return raw === null ? [] : [{ stroke: field, seconds: Number(raw) }];
    });
    if (entered.length !== 1 || !Number.isFinite(entered[0].seconds)) {
      throw new Error(`Mock test ${row.athlete_id}:${row.activity_date} must contain exactly one valid 25y stroke time.`);
    }
    if (row.time_25y_seconds !== null) {
      throw new Error(`Mock test ${row.athlete_id}:${row.activity_date} must not use the unassigned legacy 25y field.`);
    }
    const freestylePace = Number(row.pace_3x100_freestyle_seconds);
    if (!Number.isFinite(freestylePace)) {
      throw new Error(`Mock test ${row.athlete_id}:${row.activity_date} must contain a valid freestyle 3×100 pace.`);
    }
    if (row.pace_3x100_seconds !== null || nonFreestyle3x100Fields.some((field) => row[field] !== null)) {
      throw new Error(`Mock test ${row.athlete_id}:${row.activity_date} must contain only a freestyle 3×100 pace.`);
    }
    const kickCount = Number(row.kick_count);
    const strokeCount = Number(row.stroke_count);
    if (!Number.isFinite(kickCount) || !Number.isFinite(strokeCount)) {
      throw new Error(`Mock test ${row.athlete_id}:${row.activity_date} must contain valid kick and stroke counts.`);
    }
    assignedStrokes.add(entered[0].stroke);
    times.add(entered[0].seconds);
    kickCounts.add(kickCount);
    strokeCounts.add(strokeCount);
    freestylePaces.add(freestylePace);
    const key = `${row.athlete_id}:${mondayOfWeek(row.activity_date)}`;
    const week = byAthleteWeek.get(key) ?? [];
    week.push({ session: row.session_key, stroke: entered[0].stroke });
    byAthleteWeek.set(key, week);
  }

  let completeWeeks = 0;
  let matchingStrokeWeeks = 0;
  let differentStrokeWeeks = 0;
  for (const week of byAthleteWeek.values()) {
    const monday = week.find((test) => test.session === "monday_am_test");
    const friday = week.find((test) => test.session === "friday_am_test");
    if (!monday || !friday) continue;
    completeWeeks += 1;
    if (monday.stroke === friday.stroke) matchingStrokeWeeks += 1; else differentStrokeWeeks += 1;
  }
  const expectedTestsByAthleteWeek = new Map<string, Set<string>>();
  for (const row of expectedTests) {
    const key = `${row.athlete_id}:${mondayOfWeek(row.activity_date)}`;
    const sessions = expectedTestsByAthleteWeek.get(key) ?? new Set<string>();
    sessions.add(row.session_key);
    expectedTestsByAthleteWeek.set(key, sessions);
  }
  const expectedCompleteWeeks = [...expectedTestsByAthleteWeek.values()].filter((sessions) => sessions.has("monday_am_test") && sessions.has("friday_am_test")).length;
  if (completeWeeks !== expectedCompleteWeeks) throw new Error(`Expected ${expectedCompleteWeeks} complete mock test weeks, found ${completeWeeks}.`);
  if (!matchingStrokeWeeks || !differentStrokeWeeks) throw new Error("Mock tests must contain both like-stroke progression weeks and independent Monday/Friday stroke weeks.");
  if (assignedStrokes.size !== specific25yFields.length) {
    throw new Error(`Expected all four assigned 25y strokes, found ${assignedStrokes.size}.`);
  }
  if (times.size < 20 || kickCounts.size < 8 || strokeCounts.size < 8 || freestylePaces.size < 20) {
    throw new Error("Mock test time, kick, stroke, and freestyle-pace metrics need meaningful variation.");
  }
  return {
    testRows: data?.length ?? 0,
    assigned25yStrokes: assignedStrokes.size,
    matchingStrokeWeeks,
    differentStrokeWeeks,
    freestyle3x100Rows: data?.length ?? 0,
  };
}

function printPlan(input: {
  actorName: string;
  startDate: string;
  endDate: string;
  legacyAthletes: CategoryProfile[];
  storedLegacyCount: number;
  matchingLegacyCount: number;
  mockLogCount: number;
  dryRun: boolean;
}) {
  process.stdout.write(`${input.dryRun ? "Dry run" : "Replacement plan"}: ${input.startDate} through ${input.endDate}, actor ${input.actorName}.\n`);
  process.stdout.write(`Rollback audit: ${input.legacyAthletes.length} real category members, ${input.storedLegacyCount} staff-seeded rows, ${input.matchingLegacyCount} exact generated-row matches eligible for removal.\n`);
  process.stdout.write(`Replacement: 15 mock athlete accounts, 15 category memberships, ${input.mockLogCount} candidate logs.\n`);
  for (const group of TRAINING_GROUPS) {
    const names = MOCK_TRAINING_ATHLETES.filter((athlete) => athlete.group === group.name).map((athlete) => athlete.displayName).join(", ");
    process.stdout.write(`${group.name}: ${names}\n`);
  }
}

function randomPin() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : typeof error === "object" ? JSON.stringify(error) : String(error);
  process.stderr.write(`Training seed failed: ${message}\n`);
  process.exitCode = 1;
});
